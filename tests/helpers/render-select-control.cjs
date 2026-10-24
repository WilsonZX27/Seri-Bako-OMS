// Semantic substitute for source-only tests; browser tests exercise the real Radix control.
const React = require('react');
module.exports = function SemanticSelect({ options = [], ariaLabel, onValueChange, emptyValue, startEmpty, searchable, searchPlaceholder, portalContainer, ...props }) {
 const mapValue = value => emptyValue !== undefined && value === emptyValue ? '' : value;
 return React.createElement('select', {...props, 'aria-label': ariaLabel, value: mapValue(props.value), defaultValue: mapValue(props.defaultValue), onChange: event => onValueChange?.(event.target.value)}, options.map(option => React.createElement('option', {key: option.value, value: mapValue(option.value), disabled: option.disabled}, option.label)));
};
