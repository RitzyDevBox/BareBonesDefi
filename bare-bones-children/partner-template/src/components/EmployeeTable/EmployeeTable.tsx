import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Table } from "../Table";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { Card, CardContent, Input } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { AddressInput } from "../Inputs/AddressInput";
import { shortAddress } from "../../utils/formatUtils";
import { CopyButton } from "../Button/Actions/CopyButton";

interface Employee {
  employeeId: ethers.BigNumber;
  organizationSlug: string;
  role: string;
  paymentAddress: string;
  params: string;
  status: number;
}

interface EmployeeTableProps {
  employees: Employee[];
  searchEnabled?: boolean;
  renderExpandedRow: (employee: Employee, rowData: any) => React.ReactNode;
  onAddEmployee?: {
    onSubmit: (role: string, address: string) => Promise<void>;
    loading?: boolean;
  };
}

export function EmployeeTable({
  employees,
  searchEnabled = false,
  renderExpandedRow,
  onAddEmployee,
}: EmployeeTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployees = useMemo(() => {
    if (!searchEnabled || !searchQuery.trim()) {
      return employees;
    }

    const query = searchQuery.toLowerCase();
    return employees.filter((emp) => {
      const role = ethers.utils.parseBytes32String(emp.role).toLowerCase();
      const address = emp.paymentAddress.toLowerCase();
      const id = emp.employeeId.toString();

      return role.includes(query) || address.includes(query) || id.includes(query);
    });
  }, [employees, searchQuery, searchEnabled]);

  const [newEmployeeRole, setNewEmployeeRole] = useState("");
  const [newEmployeeAddress, setNewEmployeeAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAddEmployee() {
    if (!onAddEmployee || !newEmployeeRole.trim() || !newEmployeeAddress.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddEmployee.onSubmit(newEmployeeRole.trim(), newEmployeeAddress.trim());
      setNewEmployeeRole("");
      setNewEmployeeAddress("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Stack>
      {onAddEmployee && (
        <Card style={{ marginBottom: "var(--spacing-md)" }}>
          <CardContent>
            <Stack>
              <Text.Label>Add Employee</Text.Label>
              <Stack>
                <Input
                  value={newEmployeeRole}
                  onChange={(e) => setNewEmployeeRole(e.target.value)}
                  placeholder="Role (e.g., DEV)"
                />
                <AddressInput
                  value={newEmployeeAddress}
                  onChange={(e) => setNewEmployeeAddress((e.target as HTMLInputElement).value)}
                  placeholder="0x…"
                />
                <ButtonPrimary 
                  onClick={handleAddEmployee}
                  disabled={isSubmitting || onAddEmployee.loading}
                >
                  {isSubmitting || onAddEmployee.loading ? "Adding..." : "Add Employee"}
                </ButtonPrimary>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack>
        <Text.Label>Employees ({filteredEmployees.length})</Text.Label>

        {searchEnabled && (
          <Input
            type="text"
            placeholder="Search by role, address, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: "var(--spacing-sm)" }}
          />
        )}

        <Table
          columns={[
            {
              key: "id",
              header: "ID",
            },
            {
              key: "role",
              header: "Role",
            },
            {
              key: "address",
              header: "Address",
              render: (value: string) => (
                <Row gap="sm" align="center" style={{ minWidth: 0 }}>
                  <span>{shortAddress(value)}</span>
                  <CopyButton value={value} ariaLabel="Copy address" />
                </Row>
              ),
            },
          ]}
          data={filteredEmployees.map((emp) => ({
            id: emp.employeeId.toString(),
            cells: {
              id: emp.employeeId.toNumber(),
              role: ethers.utils.parseBytes32String(emp.role),
              address: emp.paymentAddress,
            },
            expandedContent: (rowData) => renderExpandedRow(emp, rowData),
          }))}
          showSearch={false}
        />
      </Stack>
    </Stack>
  );
}
