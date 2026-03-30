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

interface Payee {
	payeeId: ethers.BigNumber;
	organizationSlug: string;
	role: string;
	paymentAddress: string;
	params: string;
	status: number;
}

export interface PayeesTableProps {
	payees: Payee[];
	searchEnabled?: boolean;
	renderExpandedRow: (payee: Payee, rowData: any) => React.ReactNode;
	extraColumns?: Array<{
		key: string;
		header: string;
		render?: (value: any) => React.ReactNode;
	}>;
	getExtraCells?: (payee: Payee) => Record<string, any>;
	onAddPayee?: {
		onSubmit: (role: string, address: string) => Promise<void>;
		loading?: boolean;
	};
}

export function PayeesTable({
	payees,
	searchEnabled = false,
	renderExpandedRow,
	extraColumns = [],
	getExtraCells,
	onAddPayee,
}: PayeesTableProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredPayees = useMemo(() => {
		if (!searchEnabled || !searchQuery.trim()) {
			return payees;
		}

		const query = searchQuery.toLowerCase();
		return payees.filter((payee) => {
			const role = ethers.utils.parseBytes32String(payee.role).toLowerCase();
			const address = payee.paymentAddress.toLowerCase();
			const id = payee.payeeId.toString();

			return role.includes(query) || address.includes(query) || id.includes(query);
		});
	}, [payees, searchQuery, searchEnabled]);

	const [newPayeeRole, setNewPayeeRole] = useState("");
	const [newPayeeAddress, setNewPayeeAddress] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleAddPayee() {
		if (!onAddPayee || !newPayeeRole.trim() || !newPayeeAddress.trim()) {
			return;
		}

		setIsSubmitting(true);
		try {
			await onAddPayee.onSubmit(newPayeeRole.trim(), newPayeeAddress.trim());
			setNewPayeeRole("");
			setNewPayeeAddress("");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Stack>
			{onAddPayee && (
				<Card style={{ marginBottom: "var(--spacing-md)" }}>
					<CardContent>
						<Stack>
							<Text.Label>Add Payee</Text.Label>
							<Stack>
								<Input
									value={newPayeeRole}
									onChange={(e) => setNewPayeeRole(e.target.value)}
									placeholder="Role (e.g., DEV)"
								/>
								<AddressInput
									value={newPayeeAddress}
									onChange={(e) => setNewPayeeAddress((e.target as HTMLInputElement).value)}
									placeholder="0x…"
								/>
								<ButtonPrimary
									onClick={handleAddPayee}
									disabled={isSubmitting || onAddPayee.loading}
								>
									{isSubmitting || onAddPayee.loading ? "Adding..." : "Add Payee"}
								</ButtonPrimary>
							</Stack>
						</Stack>
					</CardContent>
				</Card>
			)}

			<Stack>
				{searchEnabled ? (
					<Row justify="between" align="center" wrap style={{ marginBottom: "var(--spacing-sm)" }}>
						<Text.Label>Payees ({filteredPayees.length})</Text.Label>
						<div style={{ width: "100%", maxWidth: 380, marginLeft: "auto" }}>
							<Input
								type="text"
								placeholder="Search by role, address, or ID..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					</Row>
				) : (
					<Text.Label>Payees ({filteredPayees.length})</Text.Label>
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
						...extraColumns,
					]}
					data={filteredPayees.map((payee) => ({
						id: payee.payeeId.toString(),
						cells: {
							id: payee.payeeId.toNumber(),
							role: ethers.utils.parseBytes32String(payee.role),
							address: payee.paymentAddress,
							...(getExtraCells ? getExtraCells(payee) : {}),
						},
						expandedContent: (rowData) => renderExpandedRow(payee, rowData),
					}))}
					showSearch={false}
				/>
			</Stack>
		</Stack>
	);
}
