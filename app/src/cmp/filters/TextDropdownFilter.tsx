import { useEffect, useRef, useState } from 'react';
import type { textDropdownFilterProps } from '../../types/filters';

export default function TextDropdownFilter({
    label,
    options,
    value,
    onChange,
}: textDropdownFilterProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const filteredOptions = options.filter(
        (option) =>
            option.toLowerCase().includes(search.toLowerCase()) &&
            !value.includes(option),
    );

    const addOption = (option: string) => {
        onChange([...value, option]);
        setSearch('');
    };

    const removeOption = (option: string) => {
        onChange(value.filter((selected) => selected !== option));
    };

    const highlightMatch = (option: string) => {
        if (!search) return option;

        const matchIndex = option.toLowerCase().indexOf(search.toLowerCase());

        if (matchIndex === -1) return option;

        return (
            <>
                {option.slice(0, matchIndex)}
                <mark>
                    {option.slice(matchIndex, matchIndex + search.length)}
                </mark>
                {option.slice(matchIndex + search.length)}
            </>
        );
    };

    return (
        <div ref={dropdownRef}>
            <label>{label}</label>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    width: '100%',
                }}
            >
                {value.length > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px',
                        }}
                    >
                        {value.map((selected) => (
                            <span
                                key={selected}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    backgroundColor: '#e8f0fe',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    maxWidth: '100%',
                                    overflowWrap: 'anywhere',
                                }}
                            >
                                {selected}
                                <button
                                    type="button"
                                    aria-label={`Remove ${selected}`}
                                    onClick={() => removeOption(selected)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        padding: '0 2px',
                                        fontSize: '14px',
                                        color: '#555',
                                    }}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                <input
                    type="text"
                    aria-label={`Search ${label}`}
                    placeholder="Search..."
                    value={search}
                    style={{
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        padding: '5px 8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                    }}
                    onFocus={() => setIsOpen(true)}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setIsOpen(true);
                    }}
                />
            </div>

            {isOpen && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        marginTop: '4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                    }}
                >
                    {filteredOptions.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => addOption(option)}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                textAlign: 'left',
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                overflowWrap: 'anywhere',
                            }}
                        >
                            {highlightMatch(option)}
                        </button>
                    ))}

                    {filteredOptions.length === 0 && <p>No matching options</p>}
                </div>
            )}
        </div>
    );
}
