import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  isModal?: boolean;
}

export const LanguageSelector = ({
  isModal = false,
}: LanguageSelectorProps) => {
  const {
    language,
    setLanguage,
    t,
    showLanguageSelector,
    setShowLanguageSelector,
  } = useLanguage();

  if (isModal) {
    return (
      <Dialog
        open={showLanguageSelector}
        onOpenChange={setShowLanguageSelector}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <DialogTitle>{t("common.selectLanguage")}</DialogTitle>
            </div>
            <DialogDescription>
              {t("common.choosePreferredLanguage")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant={language === "en" ? "default" : "outline"}
              onClick={() => setLanguage("en")}
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <span className="text-2xl">🇺🇸</span>
              <span>{t("common.english")}</span>
            </Button>

            <Button
              variant={language === "es" ? "default" : "outline"}
              onClick={() => setLanguage("es")}
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <span className="text-2xl">🇪🇸</span>
              <span>{t("common.spanish")}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Dropdown version for header
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select
        value={language}
        onValueChange={(value: any) => setLanguage(value)}
      >
        <SelectTrigger className="w-24 md:w-32 h-9 md:h-10 text-xs md:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t("common.english")}</SelectItem>
          <SelectItem value="es">{t("common.spanish")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
