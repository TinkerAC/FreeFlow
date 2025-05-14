import React, { createContext, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/* ===============================================================
   JetBrains-style lightweight UI primitives
================================================================*/

/* --------------------------- Card ---------------------------- */
export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
                                                                                    className = '',
                                                                                    children,
                                                                                  }) => (
  <div className={`rounded-2xl bg-[#2b2b2b]/60 shadow-lg ${className}`}>{
    children
  }</div>
);
export const CardContent: React.FC<{ className?: string; children: React.ReactNode }> = ({
                                                                                           className = '',
                                                                                           children,
                                                                                         }) => <div
  className={className}>{children}</div>;

/* --------------------------- Label --------------------------- */
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({
                                                                               className = '',
                                                                               children,
                                                                               ...rest
                                                                             }) => (
  <label className={`text-sm text-neutral-200 ${className}`} {...rest}>
    {children}
  </label>
);

/* --------------------------- Checkbox ------------------------ */
export const Checkbox: React.FC<{
  checked: boolean;
  onCheckedChange: () => void;
  className?: string;
}> = ({ checked, onCheckedChange, className = '' }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={onCheckedChange}
    className={`size-4 appearance-none rounded-sm border border-neutral-500 bg-neutral-800 checked:bg-blue-600 ${className}`}
  />
);

/* --------------------------- Select -------------------------- */
interface SelectCtxType {
  value: string;
  setValue: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  placeholder?: string;
}

const SelectCtx = createContext<SelectCtxType | null>(null);

export const Select: React.FC<{
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  children: React.ReactNode;
}> = ({ value, onValueChange, placeholder, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <SelectCtx.Provider value={{ value, setValue: onValueChange, open, setOpen, placeholder }}>
      <div className="relative inline-block min-w-[180px]">{children}</div>
    </SelectCtx.Provider>
  );
};

export const SelectTrigger: React.FC<{ className?: string; children?: React.ReactNode }> = ({
                                                                                              className = '',
                                                                                              children,
                                                                                            }) => {
  const ctx = useContext(SelectCtx)!;
  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={`flex w-full items-center justify-between rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 ${className}`}
    >
      {children}
      <ChevronDown className="ml-2 size-4 text-neutral-400" />
    </button>
  );
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const ctx = useContext(SelectCtx)!;
  return <span>{ctx.value || placeholder || ctx.placeholder}</span>;
};

export const SelectContent: React.FC<{ className?: string; children: React.ReactNode }> = ({
                                                                                             className = '',
                                                                                             children,
                                                                                           }) => {
  const ctx = useContext(SelectCtx)!;
  return (
    <AnimatePresence>
      {ctx.open && (
        <motion.ul
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={`absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-neutral-600 bg-[#2b2b2b]/95 py-1 shadow-lg ${className}`}
        >
          {children}
        </motion.ul>
      )}
    </AnimatePresence>
  );
};

export const SelectItem: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const ctx = useContext(SelectCtx)!;
  const selected = ctx.value === value;
  return (
    <li
      className={`cursor-pointer px-3 py-1 text-sm text-neutral-200 hover:bg-white/10 ${selected ? 'bg-blue-600/30' : ''}`}
      onClick={() => {
        ctx.setValue(value);
        ctx.setOpen(false);
      }}
    >
      {children}
    </li>
  );
};

/* =============================================================
   JetBrains-style Setting Controls
================================================================*/

/* ------------------------ Section --------------------------- */
interface SettingSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingSection: React.FC<SettingSectionProps> = ({ title, description, children }) => (
  <motion.section
    className="mb-6 rounded-2xl bg-[#2b2b2b]/60 shadow-lg backdrop-blur"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
  >
    <h2 className="border-b border-neutral-700 px-5 py-3 text-lg font-semibold text-gray-100">
      {title}
      {description && <span className="ml-2 text-sm font-normal text-neutral-400">{description}</span>}
    </h2>
    <CardContent className="divide-y divide-neutral-800 p-4 [&_>*:last-child]:border-none">
      {children}
    </CardContent>
  </motion.section>
);

/* ------------------------ Row ------------------------------- */
interface SettingRowProps {
  label: string;
  children: React.ReactNode;
}

export const SettingRow: React.FC<SettingRowProps> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-6 py-3">
    <Label className="whitespace-nowrap text-sm text-neutral-200">{label}</Label>
    <div className="flex-1">{children}</div>
  </div>
);

/* ------------------------ Dropdown -------------------------- */
interface DropdownOption {
  label: string;
  value: string;
}

interface SettingDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
}

export const SettingDropdown: React.FC<SettingDropdownProps> = ({ value, onChange, options, placeholder }) => (
  <Select value={value} onValueChange={onChange} placeholder={placeholder}>
    <SelectTrigger>
      <SelectValue placeholder={placeholder ?? '请选择…'} />
    </SelectTrigger>
    <SelectContent>
      {options.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

interface DropdownRowProps extends SettingDropdownProps {
  label: string;
}

export const SettingDropdownRow: React.FC<DropdownRowProps> = ({ label, ...rest }) => (
  <SettingRow label={label}><SettingDropdown {...rest} /></SettingRow>
);

/* ------------------------ Checkbox Group -------------------- */
interface CheckboxOption {
  label: string;
  value: string;
}

interface SettingCheckboxGroupProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: CheckboxOption[];
  columns?: number;
}

export const SettingCheckboxGroup: React.FC<SettingCheckboxGroupProps> = ({
                                                                            values,
                                                                            onChange,
                                                                            options,
                                                                            columns = 1,
                                                                          }) => {
  const toggle = (val: string) => onChange(values.includes(val) ? values.filter((v) => v !== val) : [...values, val]);
  return (
    <div className={`grid gap-y-2 ${columns > 1 ? `grid-cols-${columns}` : ''}`}>
      {options.map((opt) => (
        <label key={opt.value}
               className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-neutral-200 hover:bg-white/5">
          <Checkbox checked={values.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  );
};

interface CheckboxGroupRowProps extends SettingCheckboxGroupProps {
  label: string;
}

export const SettingCheckboxGroupRow: React.FC<CheckboxGroupRowProps> = ({ label, ...rest }) => (
  <SettingRow label={label}><SettingCheckboxGroup {...rest} /></SettingRow>
);

/* 默认导出 SettingSection */
export default SettingSection;
