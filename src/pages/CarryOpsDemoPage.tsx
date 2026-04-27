import carryOpsDemoHtml from "./CarryOps-Demo.html?raw";

const CarryOpsDemoPage = () => {
  return (
    <iframe
      title="Carry Ops Landing"
      srcDoc={carryOpsDemoHtml}
      className="h-screen w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-top-navigation-by-user-activation"
    />
  );
};

export default CarryOpsDemoPage;
