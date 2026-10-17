import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TextDropdownFilter from '../../../cmp/filters/TextDropdownFilter';

describe('TextDropdownFilter', () => {
    it('renders the label and select', () => {
        render(
            <TextDropdownFilter
                label="Language"
                options={['JavaScript', 'Python', 'Java']}
                value={['JavaScript']}
                onChange={() => {}}
            />,
        );

        expect(screen.getByText('Language')).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Search Language' }),
        ).toBeInTheDocument();
    });

    it('calls onChange when the user selects an option', () => {
        const handleChange = vi.fn();

        render(
            <TextDropdownFilter
                label="Language"
                options={['JavaScript', 'Python', 'Java']}
                value={['JavaScript']}
                onChange={handleChange}
            />,
        );

        fireEvent.focus(
            screen.getByRole('textbox', { name: 'Search Language' }),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Python' }));

        expect(handleChange).toHaveBeenCalledWith(['JavaScript', 'Python']);
    });

    it('renders the provided options', () => {
        render(
            <TextDropdownFilter
                label="Language"
                options={['JavaScript', 'Python', 'Java']}
                value={['JavaScript']}
                onChange={() => {}}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Remove JavaScript' }),
        ).toBeInTheDocument();

        fireEvent.focus(
            screen.getByRole('textbox', { name: 'Search Language' }),
        );

        expect(
            screen.getByRole('button', { name: 'Python' }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', { name: 'Java' }),
        ).toBeInTheDocument();
    });
});
