import React, { useState } from 'react';

interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
}

const Button: React.FC<ButtonProps> = ({ 
    label, 
    onClick, 
    disabled = false, 
    variant = 'primary' 
}) => {
    const [isClicked, setIsClicked] = useState(false);
    
    const handleClick = () => {
        setIsClicked(true);
        onClick();
        setTimeout(() => setIsClicked(false), 150);
    };
    
    const getButtonClass = () => {
        const baseClass = 'btn';
        const variantClass = `btn-${variant}`;
        const stateClass = isClicked ? 'btn-clicked' : '';
        const disabledClass = disabled ? 'btn-disabled' : '';
        
        return [baseClass, variantClass, stateClass, disabledClass]
            .filter(Boolean)
            .join(' ');
    };
    
    return (
        <button 
            className={getButtonClass()}
            onClick={handleClick}
            disabled={disabled}
        >
            {label}
        </button>
    );
};

export default Button;
