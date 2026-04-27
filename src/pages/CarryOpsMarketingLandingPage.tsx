import carryOpsMarketingLandingHtml from "./CarryOps-Marketing-Landing.html?raw";

const CarryOpsMarketingLandingPage = () => {
  return (
    <iframe
      title="Carry Ops Marketing Landing"
      srcDoc={carryOpsMarketingLandingHtml}
      className="h-screen w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-top-navigation-by-user-activation"
    />
  );
};

export default CarryOpsMarketingLandingPage;
