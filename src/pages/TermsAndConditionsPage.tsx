export const TermsAndConditionsPage = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        <img src="/vite.svg" className="h-10 w-10 mr-4" alt="Logo" />
        <h1 className="text-2xl font-bold text-black">Terms & Conditions</h1>
      </div>
      <div className="space-y-4 text-black">
        <p>By continuing to use this app, you agree to the following terms:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Repeated or verified complaints may lead to account suspension or ban.</li>
          <li>Maintain respectful and professional behavior with customers.</li>
          <li>Update product stock regularly to ensure accuracy.</li>
          <li>Inactive accounts may be cancelled after a period of time.</li>
          <li>Sellers must ensure product quality and handle complaints promptly.</li>
          <li>Damaged or defective items must be replaced or refunded.</li>
          <li>Any scam, fraud, or illegal activity will result in legal action.</li>
          <li>Selling illegal, restricted, or counterfeit items is strictly prohibited.</li>
        </ul>
      </div>
    </div>
  );
};
