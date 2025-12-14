function DefaultActionHandler({
  action,
  onDone,
}: {
  action: string;
  onDone: () => void;
}) {
  console.warn(`No handler registered for action: ${action}`);

  // Immediately resolve so UI doesn’t hang
  onDone();

  return null;
}

export default DefaultActionHandler;
