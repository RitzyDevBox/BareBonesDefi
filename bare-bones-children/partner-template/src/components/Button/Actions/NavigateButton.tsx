import { NavigateIcon } from "../../../assets/icons/NavigationIcon";
import { IconButton } from "../IconButton";


type Props = {
  onNavigate: () => void;
};

export function NavigateButton({ onNavigate }: Props) {
  return (
    <IconButton
      size="sm"
      aria-label="Navigate"
      onClick={onNavigate}
      style={{
        width: 32,
        height: 32,
      }}
    >
      <NavigateIcon />
    </IconButton>
  );
}
