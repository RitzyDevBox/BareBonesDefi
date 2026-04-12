import { useEffect, useRef, useState } from "react";
import { Input } from "../BasicComponents";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { Sheet } from "../Primitives/Sheet";
import { Modal } from "../Modal/Modal";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";

interface OrganizationPickerProps {
  value: string;
  onChange: (value: string) => void;
  organizations: string[];
  loadingOrganizations?: boolean;
  loadingFetch?: boolean;
  onFetch: (slug: string) => void;
  onCreateOrganization: (slug: string) => Promise<void> | void;
  isCreating?: boolean;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 150ms ease",
        color: "var(--colors-text-muted)",
        fontSize: 14,
      }}
    >
      ▾
    </span>
  );
}

export function OrganizationPicker({
  value,
  onChange,
  organizations,
  loadingOrganizations = false,
  loadingFetch = false,
  onFetch,
  onCreateOrganization,
  isCreating = false,
}: OrganizationPickerProps) {
  const screen = useMediaQuery();
  const isPhone = screen === ScreenSize.Phone;

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const typedSinceLastFetchRef = useRef(false);
  const skipNextBlurFetchRef = useRef(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function handleFetch() {
    const slug = value.trim();
    if (!slug) return;
    onFetch(slug);
    setIsOpen(false);
  }

  async function handleCreate() {
    const slug = createName.trim();
    if (!slug || isCreating) return;
    await onCreateOrganization(slug);
    setIsCreateOpen(false);
    setCreateName("");
    onChange(slug);
  }

  const createContent = (
    <Stack gap="md">
      <Text.Label>Create organization</Text.Label>
      <Input
        value={createName}
        onChange={(e) => setCreateName((e.target as HTMLInputElement).value)}
        placeholder="organization slug"
      />
      <Row justify="end" gap="sm">
        <ButtonSecondary
          shape="rounded"
          style={{ minHeight: 40, padding: "10px 16px", borderRadius: "var(--radius-sm)", minWidth: 108 }}
          onClick={() => setIsCreateOpen(false)}
        >
          Cancel
        </ButtonSecondary>
        <ButtonPrimary
          shape="rounded"
          style={{ minHeight: 40, padding: "10px 16px", borderRadius: "var(--radius-sm)", minWidth: 108 }}
          onClick={handleCreate}
          disabled={!createName.trim() || isCreating}
        >
          {isCreating ? "Creating..." : "Create"}
        </ButtonPrimary>
      </Row>
    </Stack>
  );

  return (
    <Stack gap="xs">
      <Row gap="sm" style={{ width: "100%" }}>
        <div ref={wrapperRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <Input
            value={value}
            onChange={(e) => {
              onChange((e.target as HTMLInputElement).value);
              typedSinceLastFetchRef.current = true;
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              if (skipNextBlurFetchRef.current) {
                skipNextBlurFetchRef.current = false;
                return;
              }

              if (!typedSinceLastFetchRef.current) return;
              typedSinceLastFetchRef.current = false;
              handleFetch();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFetch();
              if (e.key === "Escape") setIsOpen(false);
            }}
            placeholder="Get or create organization"
            style={{ paddingRight: 34 }}
          />
          <button
            type="button"
            aria-label="Toggle organizations dropdown"
            onClick={() => setIsOpen((prev) => !prev)}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Chevron open={isOpen} />
          </button>

          {isOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                border: "1px solid var(--colors-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--colors-surface)",
                boxShadow: "var(--shadows-medium)",
                zIndex: 30,
                maxHeight: 240,
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              {loadingOrganizations ? (
                <div style={{ padding: "10px 12px" }}>
                  <Text.Body size="sm" color="muted">Loading organizations...</Text.Body>
                </div>
              ) : organizations.length > 0 ? (
                organizations.map((org) => (
                  <button
                    key={org}
                    type="button"
                    onMouseDown={() => {
                      skipNextBlurFetchRef.current = true;
                    }}
                    onClick={() => {
                      onChange(org);
                      typedSinceLastFetchRef.current = false;
                      onFetch(org);
                      setIsOpen(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      color: "var(--colors-text-main)",
                      padding: "10px 12px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {org}
                  </button>
                ))
              ) : (
                <div style={{ padding: "10px 12px" }}>
                  <Text.Body size="sm" color="muted">No organizations yet</Text.Body>
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--colors-border)" }} />
              <button
                type="button"
                onMouseDown={() => {
                  skipNextBlurFetchRef.current = true;
                }}
                onClick={() => {
                  typedSinceLastFetchRef.current = false;
                  setCreateName(value.trim());
                  setIsCreateOpen(true);
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  color: "var(--colors-primary)",
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                + Create organization
              </button>
            </div>
          )}
        </div>

        <ButtonSecondary
          shape="rounded"
          onMouseDown={() => {
            skipNextBlurFetchRef.current = true;
          }}
          onClick={handleFetch}
          style={{ minWidth: 88, minHeight: 40, padding: "10px 14px", borderRadius: "var(--radius-sm)", whiteSpace: "nowrap", flex: 0 }}
          disabled={loadingFetch || !value.trim()}
        >
          {loadingFetch ? "..." : "Fetch"}
        </ButtonSecondary>
      </Row>

      {isPhone ? (
        <Sheet open={isCreateOpen} onClose={() => setIsCreateOpen(false)} placement="bottom">
          <div style={{ padding: "var(--spacing-md)", overflowY: "auto" }}>{createContent}</div>
        </Sheet>
      ) : (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create organization"
          width={520}
          maxWidth="95vw"
        >
          {createContent}
        </Modal>
      )}
    </Stack>
  );
}
