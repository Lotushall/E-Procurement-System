"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { getGroupLabel } from "@/app/dashboard/users/roles-permissions/_data/group-labels";
import type { Permission } from "@/lib/user/management/types";

export function PermissionPicker({
  permissions,
  value,
  onChange,
}: {
  permissions: Permission[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const groups = permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
    const group = permission.name.split(".")[0];
    (acc[group] ??= []).push(permission);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold">{getGroupLabel(group)}</p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onChange(
                    Array.from(new Set([...value, ...items.map((permission) => permission.name)])),
                  )
                }
                className="cursor-pointer text-sm font-medium text-red-700 hover:underline"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    value.filter((name) => !items.some((permission) => permission.name === name)),
                  )
                }
                className="cursor-pointer text-sm text-muted-foreground hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((permission) => (
              <label
                key={permission.name}
                htmlFor={permission.name}
                className="flex items-center gap-2.5 rounded-md border p-3 cursor-pointer hover:border-red-700/40"
              >
                <Checkbox
                  id={permission.name}
                  checked={value.includes(permission.name)}
                  onCheckedChange={(checked) =>
                    onChange(
                      checked
                        ? [...value, permission.name]
                        : value.filter((name) => name !== permission.name),
                    )
                  }
                  className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-semibold">{permission.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{permission.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
