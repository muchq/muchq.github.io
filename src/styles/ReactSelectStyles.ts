import { StylesConfig } from 'react-select';

// Base styles that work with any option type
const createBaseSelectStyles = <OptionType extends { value: string | number; label: string }>(): StylesConfig<OptionType, false> => ({
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#0a0a0a',
    borderColor: state.isFocused ? '#00ffff' : '#00ffff',
    borderWidth: '1px',
    borderRadius: 0,
    boxShadow: state.isFocused ? '0 0 15px #00ffff' : 'none',
    '&:hover': {
      borderColor: '#00ffff',
      boxShadow: '0 0 10px #00ffff'
    },
    fontFamily: 'monospace',
    cursor: 'pointer',
    minHeight: '38px'
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#0a0a0a',
    border: '2px solid #00ffff',
    borderRadius: 0,
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
    zIndex: 9999
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
    backgroundColor: '#0a0a0a'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'rgba(0, 255, 255, 0.2)' 
      : state.isFocused 
        ? 'rgba(0, 255, 255, 0.1)' 
        : '#0a0a0a',
    color: state.isSelected ? '#00ffff' : '#00ffff',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    borderLeft: state.isSelected ? '3px solid #00ffff' : '3px solid transparent',
    '&:hover': {
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
      color: '#00ffff'
    },
    '&:active': {
      backgroundColor: 'rgba(0, 255, 255, 0.2)'
    }
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#00ffff',
    fontFamily: 'monospace',
    fontSize: '0.9rem'
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: '#00ffff',
    '&:hover': {
      color: '#00ffff'
    }
  }),
  indicatorSeparator: () => ({
    display: 'none'
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'rgba(0, 255, 255, 0.5)',
    fontFamily: 'monospace'
  }),
  input: (provided) => ({
    ...provided,
    color: '#00ffff',
    fontFamily: 'monospace'
  }),
  clearIndicator: (provided) => ({
    ...provided,
    color: '#00ffff',
    '&:hover': {
      color: '#ff0066'
    }
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    border: '1px solid #00ffff'
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#00ffff',
    fontFamily: 'monospace'
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#00ffff',
    '&:hover': {
      backgroundColor: 'rgba(255, 0, 102, 0.2)',
      color: '#ff0066'
    }
  })
});

// Pink/Magenta variant for special modules
const createPinkSelectStyles = <OptionType extends { value: string | number; label: string }>(): StylesConfig<OptionType, false> => ({
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#0a0a0a',
    borderColor: state.isFocused ? '#ff0066' : '#ff0066',
    borderWidth: '1px',
    borderRadius: 0,
    boxShadow: state.isFocused ? '0 0 15px #ff0066' : 'none',
    '&:hover': {
      borderColor: '#ff0066',
      boxShadow: '0 0 10px #ff0066'
    },
    fontFamily: 'monospace',
    cursor: 'pointer',
    minHeight: '38px'
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#0a0a0a',
    border: '2px solid #ff0066',
    borderRadius: 0,
    boxShadow: '0 0 20px rgba(255, 0, 102, 0.5)',
    zIndex: 9999
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
    backgroundColor: '#0a0a0a'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'rgba(255, 0, 102, 0.2)' 
      : state.isFocused 
        ? 'rgba(255, 0, 102, 0.1)' 
        : '#0a0a0a',
    color: state.isSelected ? '#ff0066' : '#ff0066',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    borderLeft: state.isSelected ? '3px solid #ff0066' : '3px solid transparent',
    '&:hover': {
      backgroundColor: 'rgba(255, 0, 102, 0.1)',
      color: '#ff0066'
    },
    '&:active': {
      backgroundColor: 'rgba(255, 0, 102, 0.2)'
    }
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#ff0066',
    fontFamily: 'monospace',
    fontSize: '0.9rem'
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: '#ff0066',
    '&:hover': {
      color: '#ff0066'
    }
  }),
  indicatorSeparator: () => ({
    display: 'none'
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'rgba(255, 0, 102, 0.5)',
    fontFamily: 'monospace'
  }),
  input: (provided) => ({
    ...provided,
    color: '#ff0066',
    fontFamily: 'monospace'
  })
});

// Export the style creators
export const retroSelectStyles = createBaseSelectStyles;
export const retroSelectStylesPink = createPinkSelectStyles;

// For backward compatibility, export pre-created styles for common option types
export const customSelectStyles = createBaseSelectStyles<{ value: string; label: string }>();
export const customSelectStylesPink = createPinkSelectStyles<{ value: string; label: string }>();