import { PageContainer } from "../components/PageWrapper/PageContainer";
import { VerticalListFlow } from "../components/Landing/VerticalListFlow";
import { LANDING_FLOW } from "./LandingContent";

export function LandingPage() {
  return (
    <PageContainer>
      <VerticalListFlow
        items={LANDING_FLOW}
        layout="staggered"
      />
    </PageContainer>
  );
}
