import type { sidebarFiltersProps } from '../types/filters';
import SliderFilter from './filters/SliderFilter';
import TextDropdownFilter from './filters/TextDropdownFilter';

export default function SidebarFilters({
    filters,
    values,
    onChange,
    onReset,
}: sidebarFiltersProps) {
    return (
        <aside className="sidebar-filters">
            <div className="sidebar-filter-heading">Manual Filters</div>
            <div className="sidebar-filter-list">
                {filters.map((filter) => {
                    const currentValue = values[filter.key];

                    return (
                        <div className="sidebar-filter-item" key={filter.key}>
                            {filter.type === 'slider' ? (
                                <SliderFilter
                                    label={filter.label}
                                    min={filter.min}
                                    max={filter.max}
                                    value={
                                        typeof currentValue === 'number'
                                            ? currentValue
                                            : (filter.defaultValue ?? 0)
                                    }
                                    onChange={(value) =>
                                        onChange(filter.key, value)
                                    }
                                />
                            ) : (
                                <TextDropdownFilter
                                    label={filter.label}
                                    options={filter.options}
                                    value={
                                        Array.isArray(currentValue)
                                            ? currentValue
                                            : (filter.defaultValue ?? [])
                                    }
                                    onChange={(value) =>
                                        onChange(filter.key, value)
                                    }
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <button
                type="button"
                className="sidebar-reset-button"
                onClick={onReset}
            >
                Reset All Filters
            </button>
        </aside>
    );
}
