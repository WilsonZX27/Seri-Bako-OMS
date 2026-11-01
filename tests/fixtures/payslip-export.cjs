const id=n=>`e1000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function payslipRow(extra={}) {return {
 id:id(1),company_id:id(2),staff_id:id(3),confirmation_id:id(4),version:3,currency:'MYR',earnings:'1000.40',deductions:'12.35',state:'released',approved_at:'2026-11-01T04:00:00Z',released_at:'2026-11-01T04:01:00Z',
 detail:[{kind:'earning',label:'Synthetic basic · 合成金额',amount:1000.10},{kind:'earning',label:'=HYPERLINK("https://example.invalid","OT")',amount:.30},{kind:'earning',label:'Synthetic zero',amount:0},{kind:'deduction',label:'Synthetic verified deduction',amount:12.34},{kind:'deduction',label:'Synthetic cent',amount:.01}],
 attendance_confirmations:{id:id(4),company_id:id(2),staff_id:id(3),period_start:'2026-10-26',period_end:'2026-11-01',state:'approved',staffs:{full_name:'Synthetic employee · 合成人员',staff_code:'00068'},attendance:[{date:'2026-10-26',statuses:['late','missing_check_out']},{date:'2026-11-01',statuses:['normal']}]},...extra,
};}
module.exports={id,payslipRow};
