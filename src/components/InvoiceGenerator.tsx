import React, { useState } from "react";
import {
  generateInvoice,
  generateAndDownloadInvoicePDF,
  getCurrentMonthDateRange,
  getPreviousMonthDateRange,
  getLastNDaysDateRange,
  getCustomDateRange,
  type InvoiceRequest,
} from "@/lib/invoiceService";
import { useLanguage } from "@/lib/LanguageContext";

interface InvoiceGeneratorProps {
  onClose?: () => void;
}

export function InvoiceGenerator({ onClose }: InvoiceGeneratorProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoicePdf, setInvoicePdf] = useState<Blob | null>(null);

  // Form state
  const [dateRange, setDateRange] = useState<
    "current" | "previous" | "last7" | "custom"
  >("current");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [carrier, setCarrier] = useState("");
  const [destinationSite, setDestinationSite] = useState("");

  /**
   * Get date range based on selection
   */
  const getDateRange = (): { start_date: string; end_date: string } => {
    switch (dateRange) {
      case "current":
        return getCurrentMonthDateRange();
      case "previous":
        return getPreviousMonthDateRange();
      case "last7":
        return getLastNDaysDateRange(7);
      case "custom":
        return getCustomDateRange(new Date(startDate), new Date(endDate));
      default:
        return getCurrentMonthDateRange();
    }
  };

  /**
   * Handle date range change
   */
  const handleDateRangeChange = (value: string) => {
    setDateRange(value as any);
    const range = getDateRange();
    setStartDate(range.start_date);
    setEndDate(range.end_date);
  };

  /**
   * Generate invoice
   */
  const handleGenerateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      setInvoicePdf(null);

      const request: InvoiceRequest = {
        start_date: startDate,
        end_date: endDate,
        ...(carrier && { carrier }),
        ...(destinationSite && { destination_site: destinationSite }),
      };

      const result = await generateInvoice(request);

      if (!result.success) {
        setError(result.error || "Failed to generate invoice");
        return;
      }

      setInvoicePdf(result.pdfBlob || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download invoice as PDF
   */
  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      const request: InvoiceRequest = {
        start_date: startDate,
        end_date: endDate,
        ...(carrier && { carrier }),
        ...(destinationSite && { destination_site: destinationSite }),
      };

      await generateAndDownloadInvoicePDF(request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {t("invoice.generator.title") || "Invoice Generator"}
          </h2>
          <p className="text-gray-600 mt-2">
            {t("invoice.generator.description") ||
              "Generate invoices for tickets in a specified date range"}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {!invoicePdf ? (
            <div className="space-y-6">
              {/* Date Range Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("invoice.generator.dateRange") || "Date Range"}
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="current">
                      {t("invoice.generator.currentMonth") || "Current Month"}
                    </option>
                    <option value="previous">
                      {t("invoice.generator.previousMonth") || "Previous Month"}
                    </option>
                    <option value="last7">
                      {t("invoice.generator.last7Days") || "Last 7 Days"}
                    </option>
                    <option value="custom">
                      {t("invoice.generator.custom") || "Custom"}
                    </option>
                  </select>
                </div>

                {dateRange === "custom" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("invoice.generator.startDate") || "Start Date"}
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("invoice.generator.endDate") || "End Date"}
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("invoice.generator.carrier") || "Carrier (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="Filter by carrier"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("invoice.generator.destinationSite") ||
                      "Destination Site (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={destinationSite}
                    onChange={(e) => setDestinationSite(e.target.value)}
                    placeholder="Filter by destination site"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    {t("common.cancel") || "Cancel"}
                  </button>
                )}
                <button
                  onClick={handleGenerateInvoice}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading
                    ? t("common.loading") || "Loading..."
                    : t("invoice.generator.generate") || "Generate Invoice"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Invoice Preview */}
              <div className="border rounded-lg overflow-hidden bg-gray-100">
                <div className="p-4 text-center">
                  <p className="text-gray-600 mb-4">📄 Invoice PDF Generated</p>
                  <button
                    onClick={() => {
                      if (invoicePdf) {
                        const url = URL.createObjectURL(invoicePdf);
                        window.open(url, "_blank");
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {t("common.preview") || "Preview PDF"}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setInvoicePdf(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  {t("common.back") || "Back"}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                >
                  {loading
                    ? t("common.loading") || "Loading..."
                    : t("invoice.generator.download") || "Download PDF"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
