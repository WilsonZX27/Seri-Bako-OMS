"""Build an idempotent, private rehearsal payload; never connects to production."""
import argparse
import json
import pathlib
import uuid

LOCATION_CODES = {
    'KL - IOI Puchong': 'IOI-PUCHONG', 'KL - Jakel Mall': 'JAKEL',
    'KL - MidValley': 'MIDVALLEY', 'KL - PJS10 (Central Kitchen)': 'CK-PJS10',
    'KL - Petaling Street': 'PETALING STREET', 'KL - Publika': 'PUBLIKA',
    'KL - Sunway Pyramid': 'SUNWAY PYRAMID', 'KL - Sunway Velocity': 'SUNWAY VELOCITY',
    'KL - TRX': 'TRX', 'PNG - ALMA (Central Kitchen)': 'CK-ALMA',
    'PNG - Gurney': 'GURNEY', 'PNG - Queensbay': 'QUEENSBAY',
}


def build(snapshot, branches):
    if snapshot['issues']:
        raise ValueError('Resolve snapshot issues before building an import.')
    company_ids = {b['company_id'] for b in branches}
    if len(company_ids) != 1:
        raise ValueError('Branch catalogue must contain exactly one company.')
    company = next(iter(company_ids))
    codes = {b['branch_code']: b['id'] for b in branches}
    if len(codes) != len(branches):
        raise ValueError('Duplicate branch code.')
    stable = lambda kind, key: str(uuid.uuid5(uuid.NAMESPACE_URL, f'OMS-assets:{company}:{kind}:{key}'))
    batch = stable('batch', snapshot['source_sha256'])
    tables = snapshot['tables']
    result = {'asset_import_batches': [{'id': batch, 'company_id': company,
              'source_sha256': snapshot['source_sha256'], 'reconciliation': snapshot['summary'], 'state': 'rehearsal'}]}
    locations = {}
    names = {r['Location'] for table in ('Asset Master List', 'Maintenance Requests', 'Daily Audit Logs') for r in tables[table]}
    for name in sorted(names):
        if name != 'Event' and (name not in LOCATION_CODES or LOCATION_CODES[name] not in codes):
            raise ValueError(f'Unmatched location: {name}')
        locations[name] = stable('location', name)
    result['asset_locations'] = [{'id': value, 'company_id': company, 'source_name': name,
        'kind': 'event' if name == 'Event' else 'branch',
        'branch_id': None if name == 'Event' else codes[LOCATION_CODES[name]]} for name, value in locations.items()]
    assets = {r['Asset ID']: stable('asset', r['Asset ID']) for r in tables['Asset Master List']}
    quantity = lambda value: None if value is None or value == '' else int(value)
    result['assets'] = [{'id': assets[r['Asset ID']], 'company_id': company, 'asset_code': r['Asset ID'],
        'item_name': r['Item Name'], 'source_data': r, 'import_batch_id': batch} for r in tables['Asset Master List']]
    result['asset_holdings'] = [{'id': stable('holding', r['Asset ID'] + ':' + r['Location']),
        'company_id': company, 'asset_id': assets[r['Asset ID']], 'location_id': locations[r['Location']],
        'quantity': quantity(r['Qty']), 'condition': r['Condition'], 'status': r['Current Status'],
        'latest_check_date': r['Last Checked Date'][:10] if r['Last Checked Date'] else None,
        'latest_check_result': r['Latest Audit Result'], 'latest_check_remark': r['Latest Remark']}
        for r in tables['Asset Master List']]
    maintenance = {r['Request ID']: stable('maintenance', r['Request ID']) for r in tables['Maintenance Requests']}
    result['asset_maintenance'] = [{'id': maintenance[r['Request ID']], 'company_id': company,
        'asset_id': assets[r['Asset ID']], 'location_id': locations[r['Location']], 'source_id': r['Request ID'],
        'status': r['Status'], 'priority': r['Priority'] or r['Urgency'] or 'Unrecorded',
        'description': r['Description'] or '', 'author_name': r['Staff Name'] or '', 'source_data': r}
        for r in tables['Maintenance Requests']]
    result['asset_maintenance_updates'] = [{'id': stable('maintenance-update', r['Update ID']),
        'company_id': company, 'maintenance_id': maintenance[r['Request ID']], 'source_id': r['Update ID'],
        'author_name': r['Updated By'] or '', 'source_data': r} for r in tables['Maintenance Updates']]
    result['asset_daily_checks'] = [{'id': stable('check', r['_source_key']), 'company_id': company,
        'asset_id': assets[r['Asset ID']], 'location_id': locations[r['Location']], 'source_key': r['_source_key'],
        'submission_id': r['Submission ID'], 'check_date': r['Audit Date'][:10], 'result': r['Result'],
        'quantity': quantity(r['Qty']), 'author_name': r['Staff Name'] or '', 'source_data': r}
        for r in tables['Daily Audit Logs']]
    # An empty source transfer dataset is supported; a later populated one requires a reviewed mapping.
    if tables['Asset Transfer Requests'] or tables['Asset Transfer Updates']:
        raise ValueError('Transfer source changed: review its lifecycle mapping before importing.')
    result['asset_transfers'], result['asset_transfer_updates'] = [], []
    result['asset_attachments'] = []
    for r in tables['Attachments']:
        related_type = r['Related Type']
        if related_type not in ('Maintenance', 'Asset', 'Asset Master'):
            raise ValueError('Unsupported attachment parent type: review its mapping before importing.')
        if r['Source Type'] and r['Source Type'] != related_type:
            raise ValueError('Attachment parent types disagree.')
        if r['Source ID'] and r['Source ID'] != r['Related ID']:
            raise ValueError('Attachment parent IDs disagree.')
        parent = next((m for m in tables['Maintenance Requests'] if m['Request ID'] == r['Related ID']), None) if related_type == 'Maintenance' else None
        if related_type == 'Maintenance' and not parent:
            raise ValueError('Unmatched attachment maintenance parent.')
        asset_code = r['Asset ID'] or (parent['Asset ID'] if parent else None)
        if parent and parent['Asset ID'] != asset_code:
            raise ValueError('Attachment and maintenance asset IDs disagree.')
        if related_type != 'Maintenance' and r['Related ID'] != asset_code:
            raise ValueError('Unmatched attachment asset parent.')
        if asset_code not in assets or not r['File URL']:
            raise ValueError('Unmatched or missing attachment source.')
        result['asset_attachments'].append({'id': stable('attachment', r['_source_key']), 'company_id': company,
            'asset_id': assets[asset_code], 'maintenance_id': maintenance[parent['Request ID']] if parent else None,
            'location_id': locations[parent['Location']] if parent else None,
            'source_key': r['_source_key'], 'source_data': r, 'url': r['File URL']})
    result['asset_suppliers'] = [{'id': stable('supplier', r['_source_key']), 'company_id': company,
        'source_id': r['_source_key'], 'source_data': r} for r in tables['Suppliers']]
    result['asset_calendar_days'] = []
    result['asset_master_updates'] = []
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', required=True)
    parser.add_argument('--branches', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    payload = build(json.loads(pathlib.Path(args.snapshot).read_text()), json.loads(pathlib.Path(args.branches).read_text())['rows'])
    pathlib.Path(args.output).write_text(json.dumps(payload, ensure_ascii=False))
    print(json.dumps({table: len(rows) for table, rows in payload.items()}))
