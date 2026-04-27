import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, XCircle, Camera, X, Mic, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { truckInspectionService, type DailyInspection, type InspectionItem, type InspectionSection, type InspectionGroup, type InspectionItemStatus } from "@/lib/truckInspectionService";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { SpeechToTextInput, type SpeechToTextInputRef } from "@/components/SpeechToTextInput";
import { SignaturePad } from "@/components/SignaturePad";

interface TruckInspectionChecklistProps {
  truckId: string;
  driverId?: string;
  isShiftActive: boolean;
  onCompleted?: () => void;
}

export const TruckInspectionChecklist = ({
  truckId,
  driverId,
  isShiftActive,
  onCompleted,
}: TruckInspectionChecklistProps) => {
  const [inspection, setInspection] = useState<DailyInspection | null>(null);
  const [sections, setSections] = useState<(InspectionSection & { groups?: InspectionGroup[] })[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [collapsedRedItems, setCollapsedRedItems] = useState<Set<string>>(new Set()); // Track collapsed red items
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set()); // Track collapsed groups
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemImages, setItemImages] = useState<Record<string, string[]>>({});
  const [isUploadingImage, setIsUploadingImage] = useState<Record<string, boolean>>({});
  const [isListeningToSpeech, setIsListeningToSpeech] = useState<Record<string, boolean>>({});
  const [inspectionMode, setInspectionMode] = useState<'critical-issue-first' | 'location-based'>('location-based');
  const [signature, setSignature] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const speechInputRefs = useRef<Record<string, SpeechToTextInputRef>>({});
  const previousModeRef = useRef<'critical-issue-first' | 'location-based' | undefined>(undefined);

  useEffect(() => {
    if (isShiftActive && truckId) {
      // Reset completion state when shift becomes active to require new inspection
      setIsCompleted(false);
      setSignature(null);
      setAgreed(false);
      loadInspection();
    } else {
      // Reset completion state when shift ends
      setIsCompleted(false);
      setSignature(null);
      setAgreed(false);
    }
  }, [truckId, driverId, isShiftActive]);

  // Reset expanded states only when mode changes
  useEffect(() => {
    if (previousModeRef.current !== undefined && previousModeRef.current !== inspectionMode) {
      setExpandedGroupId(null);
      setExpandedItemId(null);
      setCollapsedGroups(new Set()); // Reset collapsed groups when mode changes
      setCollapsedRedItems(new Set()); // Reset collapsed items when mode changes
      hasAutoExpandedRef.current = {}; // Reset auto-expand tracking when mode changes
    }
    previousModeRef.current = inspectionMode;
  }, [inspectionMode]);

  // Update sections when inspection items or mode changes (but don't reset expanded states)
  useEffect(() => {
    if (inspection?.items) {
      const grouped = truckInspectionService.groupItemsBySections(
        inspection.items,
        inspectionMode
      );
      setSections(grouped);
    }
  }, [inspection?.items, inspectionMode]);

  const hasAutoExpandedRef = useRef<Record<string, boolean>>({}); // Track which items we've already auto-expanded

  // Load notes and images for items and auto-expand red items (only once per item)
  useEffect(() => {
    if (inspection?.items) {
      const notesMap: Record<string, string> = {};
      const imagesMap: Record<string, string[]> = {};
      
      inspection.items.forEach((item) => {
        if (item.status) {
          notesMap[item.id] = item.status.notes || "";
          imagesMap[item.id] = item.status.image_urls || [];
        }
      });
      
      setItemNotes(notesMap);
      setItemImages(imagesMap);
      
      // Auto-expand red items across all sections (only once, not on every update)
      const inspectionKey = `${inspection.id}-${inspectionMode}`;
      if (!hasAutoExpandedRef.current[inspectionKey]) {
        // Find the first red item across all sections
        for (const section of sections) {
          if (section.groups) {
            for (const group of section.groups) {
              const redItem = group.items.find((item) => item.status?.status === "not_working");
              if (redItem) {
                setExpandedGroupId(group.name);
                setExpandedItemId(redItem.id);
                // Scroll to the red item only on initial expansion, not on updates
                setTimeout(() => {
                  const element = document.getElementById(`inspection-item-${redItem.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 100);
                hasAutoExpandedRef.current[inspectionKey] = true;
                break; // Expand the first red item found
              }
            }
            if (hasAutoExpandedRef.current[inspectionKey]) break;
          }
        }
      }
    }
  }, [inspection?.id, sections, inspectionMode]); // Only depend on inspection.id, not full inspection object

  const loadInspection = async () => {
    if (!truckId) return;

    setIsLoading(true);
    const result = await truckInspectionService.getOrCreateTodayInspection(
      truckId,
      driverId
    );

    if (result.success && result.data) {
      setInspection(result.data);
      
      // Check if inspection is already completed
      // Note: We check but don't set completed state if shift just started
      // This allows the inspection to be reset when shift starts
      const { data: inspectionData } = await supabase
        .from("truck_daily_inspections")
        .select("completed_at, driver_signature, driver_agreement")
        .eq("id", result.data.id)
        .single();

      // Only mark as completed if there's a completion timestamp AND we're not forcing a reset
      // The reset happens when shift starts, so we check completed_at here
      if (inspectionData?.completed_at) {
        setIsCompleted(true);
        setSignature(inspectionData.driver_signature || null);
        setAgreed(inspectionData.driver_agreement || false);
      } else {
        // Ensure completion state is false if not completed
        setIsCompleted(false);
        setSignature(null);
        setAgreed(false);
      }
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load inspection",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  // Get group status based on its items
  const getGroupStatus = (group: InspectionGroup): "working" | "not_working" => {
    const hasRedItem = group.items.some(
      (item) => item.status?.status === "not_working"
    );
    return hasRedItem ? "not_working" : "working";
  };

  // Handle group toggle - when clicking a group tile (just expand/collapse, don't mark items)
  const handleGroupToggle = (group: InspectionGroup) => {
    const isCurrentlyCollapsed = collapsedGroups.has(group.name);
    
    // Toggle collapse state
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (isCurrentlyCollapsed) {
        // Expand: remove from collapsed set
        newSet.delete(group.name);
        setExpandedGroupId(group.name);
      } else {
        // Collapse: add to collapsed set
        newSet.add(group.name);
      }
      return newSet;
    });
  };

  // Handle item toggle
  const handleItemToggle = async (itemId: string, closeExpanded = true) => {
    if (!inspection) return;

    const item = inspection.items?.find((i) => i.id === itemId);
    if (!item) return;

    const currentStatus = item.status?.status || "working";
    const newStatus = currentStatus === "not_working" ? "working" : "not_working";

    setIsUpdating(true);

    try {
      // If switching to "working", clear notes and images
      const notesToSave = newStatus === "working" ? undefined : (itemNotes[itemId] || undefined);
      const imagesToSave = newStatus === "working" ? undefined : (itemImages[itemId] || []);

      const result = await truckInspectionService.updateItemStatus(
        inspection.id,
        itemId,
        newStatus,
        notesToSave,
        imagesToSave?.length > 0 ? imagesToSave : undefined
      );

      if (result.success) {
        // Update local state
        const updatedStatus: InspectionItemStatus = newStatus === "working" 
          ? {
              id: item.status?.id || "",
              item_id: itemId,
              status: newStatus as "working" | "not_working",
              notes: undefined,
              image_urls: undefined,
              checked_at: new Date().toISOString(),
            }
          : {
              id: item.status?.id || "",
              item_id: itemId,
              status: newStatus as "working" | "not_working",
              notes: itemNotes[itemId] || undefined,
              image_urls: itemImages[itemId] || undefined,
              checked_at: new Date().toISOString(),
            };

        const updatedItems = inspection.items.map((i) => {
          if (i.id === itemId) {
            return { ...i, status: updatedStatus };
          }
          return i;
        });

        setInspection({ ...inspection, items: updatedItems });

        // Clear notes and images if switching to working
        if (newStatus === "working") {
          setItemNotes((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
          setItemImages((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
          if (closeExpanded) {
            setExpandedItemId(null);
          }
        } else {
          // When marking as red, ensure the group is expanded and item panel is visible
          // Find which group contains this item across all sections
          for (const section of sections) {
            if (section.groups) {
              for (const group of section.groups) {
                if (group.items.some((i) => i.id === itemId)) {
                  setExpandedGroupId(group.name);
                  break;
                }
              }
            }
          }
          setExpandedItemId(itemId);
          
          // Don't scroll when toggling - let user control their view
          // Only auto-scroll on initial expansion (handled in useEffect above)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update item",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error toggling item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotesChange = async (itemId: string, notes: string) => {
    // Save current scroll position to prevent auto-scroll
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    setItemNotes((prev) => ({ ...prev, [itemId]: notes }));

    const item = inspection?.items?.find((i) => i.id === itemId);
    if (item?.status?.status === "not_working") {
      // Persist notes to database immediately
      const result = await truckInspectionService.updateItemStatus(
        inspection!.id,
        itemId,
        "not_working",
        notes || undefined,
        itemImages[itemId]?.length > 0 ? itemImages[itemId] : undefined
      );
      
      if (result.success) {
        // Update local state to reflect persisted notes
        const updatedItems = inspection.items.map((i) => {
          if (i.id === itemId && i.status) {
            return {
              ...i,
              status: {
                ...i.status,
                notes: notes || undefined,
              },
            };
          }
          return i;
        });
        setInspection({ ...inspection, items: updatedItems });
        
        // Restore scroll position after state update
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      }
    }
  };

  // Compress image before upload for better performance
  const compressImage = async (file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    if (!inspection) return;

    setIsUploadingImage((prev) => ({ ...prev, [itemId]: true }));

    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file);
      const timestamp = Date.now();
      const filename = `inspection-${inspection.id}-${itemId}-${timestamp}.jpg`;
      const filepath = `truck-inspections/${filename}`;

      // Upload compressed image
      const { error: uploadError } = await supabase.storage
        .from("ticket-images")
        .upload(filepath, compressedBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("ticket-images")
        .getPublicUrl(filepath);

      const newImages = [...(itemImages[itemId] || []), publicData.publicUrl];
      setItemImages((prev) => ({ ...prev, [itemId]: newImages }));

      // Persist images to database immediately (replace the entire array)
      const result = await truckInspectionService.updateItemStatus(
        inspection.id,
        itemId,
        "not_working",
        itemNotes[itemId] || undefined,
        newImages // Pass the new array to replace, not merge
      );
      
      if (result.success) {
        // Update local state to reflect persisted images
        const updatedItems = inspection.items.map((i) => {
          if (i.id === itemId && i.status) {
            return {
              ...i,
              status: {
                ...i.status,
                image_urls: newImages,
              },
            };
          }
          return i;
        });
        setInspection({ ...inspection, items: updatedItems });
        
        toast({
          title: "Image Uploaded",
          description: "Photo has been saved",
        });
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleRemoveImage = async (itemId: string, imageIndex: number) => {
    if (!inspection) return;

    try {
      // Get the current images array
      const currentImages = itemImages[itemId] || [];
      
      // Remove the image at the specified index
      const newImages = currentImages.filter((_, i) => i !== imageIndex);
      
      // Update local state immediately for responsive UI
      setItemImages((prev) => ({ ...prev, [itemId]: newImages }));

      // Persist updated images to database (replace the entire array)
      const result = await truckInspectionService.updateItemStatus(
        inspection.id,
        itemId,
        "not_working",
        itemNotes[itemId] || undefined,
        newImages // Pass the new array to replace, not merge
      );
      
      if (result.success) {
        // Update local state to reflect persisted images
        const updatedItems = inspection.items.map((i) => {
          if (i.id === itemId && i.status) {
            return {
              ...i,
              status: {
                ...i.status,
                image_urls: newImages.length > 0 ? newImages : undefined,
              },
            };
          }
          return i;
        });
        setInspection({ ...inspection, items: updatedItems });
        
        toast({
          title: "Image Removed",
          description: "Photo has been deleted",
        });
      } else {
        // Revert local state if database update failed
        setItemImages((prev) => ({ ...prev, [itemId]: currentImages }));
        toast({
          title: "Error",
          description: result.error || "Failed to remove image",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error removing image:", error);
      // Revert local state on error
      const currentImages = itemImages[itemId] || [];
      setItemImages((prev) => ({ ...prev, [itemId]: currentImages }));
      toast({
        title: "Error",
        description: error.message || "Failed to remove image",
        variant: "destructive",
      });
    }
  };

  const handleCameraCapture = (itemId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e: any) => {
      if (e.target.files && e.target.files[0]) {
        handleImageUpload(itemId, e.target.files[0]);
      }
    };
    input.click();
  };


  if (!isShiftActive) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="text-center py-6 sm:py-8">
          <p className="text-sm sm:text-base text-muted-foreground">
            Please start your shift to begin the truck inspection
          </p>
        </div>
      </Card>
    );
  }

  // Show completion message when inspection is completed
  if (isCompleted) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="text-center py-6 sm:py-8 space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
              Inspection Complete
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Your truck inspection has been completed and submitted successfully.
            </p>
            {signature && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Signed:</p>
                <img
                  src={signature}
                  alt="Driver signature"
                  className="h-16 w-full max-w-xs mx-auto object-contain border rounded-lg bg-white p-2"
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-6 sm:py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!inspection || sections.length === 0) {
    return (
      <Card className="p-4 sm:p-6">
        <p className="text-sm sm:text-base text-muted-foreground text-center py-4">
          No inspection items found
        </p>
      </Card>
    );
  }

  // Collect all groups from all sections
  const allGroups: Array<{ group: InspectionGroup; sectionName: string }> = [];
  sections.forEach((section) => {
    if (section.groups) {
      section.groups.forEach((group) => {
        allGroups.push({ group, sectionName: section.name });
      });
    }
  });

  const handleCompleteInspection = async () => {
    if (!inspection) return;

    // Validate signature and agreement
    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please provide your signature before completing the inspection.",
        variant: "destructive",
      });
      return;
    }

    if (!agreed) {
      toast({
        title: "Agreement Required",
        description: "Please check 'I agree' to confirm the inspection is complete.",
        variant: "destructive",
      });
      return;
    }

    setIsCompleting(true);

    try {
      // Update inspection with completion data
      const { error } = await supabase
        .from("truck_daily_inspections")
        .update({
          completed_at: new Date().toISOString(),
          driver_signature: signature,
          driver_agreement: true,
        })
        .eq("id", inspection.id);

      if (error) throw error;

      // Generate and save inspection report, then send SMS to driver
      try {
        const reportResult = await truckInspectionService.generateAndSaveInspectionReport(inspection.id);
        if (reportResult.success && reportResult.reportUrl) {
          console.log("Inspection report generated:", reportResult.reportUrl);
        }
      } catch (reportError) {
        console.error("Error generating inspection report:", reportError);
        // Don't fail the inspection completion if report generation fails
      }

      setIsCompleted(true);
      
      toast({
        title: "Inspection Complete",
        description: "Truck inspection has been completed successfully. Report saved to your profile.",
      });

      // Notify parent component
      if (onCompleted) {
        onCompleted();
      }
    } catch (error: any) {
      console.error("Error completing inspection:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete inspection",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const toggleRedItemCollapse = (itemId: string) => {
    setCollapsedRedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  return (
    <Card className="p-3 sm:p-4 md:p-6">
      <div className="w-full">
        {/* Header Section */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="text-lg sm:text-xl font-bold">Truck Inspection</h3>
          </div>

          {/* Mode Toggle */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0 pt-2 pb-2 border-t border-b sm:mb-4">
            <Label className="text-sm font-medium text-muted-foreground sm:text-xs">Inspection Mode:</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={inspectionMode === 'critical-issue-first' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInspectionMode('critical-issue-first')}
                className="h-11 sm:h-8 px-4 sm:px-3 text-sm flex-1 sm:flex-initial min-h-[48px] sm:min-h-0 font-medium"
              >
                Risk-First
              </Button>
              <Button
                type="button"
                variant={inspectionMode === 'location-based' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInspectionMode('location-based')}
                className="h-11 sm:h-8 px-4 sm:px-3 text-sm flex-1 sm:flex-initial min-h-[48px] sm:min-h-0 font-medium"
              >
                Location-Based
              </Button>
            </div>
          </div>
        </div>

        {/* All Groups from All Sections */}
        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          {sections.map((section) => (
            <div key={section.name} className="space-y-3 sm:space-y-4">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-3 sm:mb-2 pt-1">
                <h4 className="text-base sm:text-xl font-bold text-foreground">{section.name}</h4>
              </div>
            
              {/* Groups in this section */}
              {(section.groups || []).map((group) => {
          const groupStatus = getGroupStatus(group);
          const isGroupRed = groupStatus === "not_working";
          const isGroupCollapsed = collapsedGroups.has(group.name);
          // Group is expanded if it's not collapsed AND (it has red items OR it's the expanded group)
          const isGroupExpanded = !isGroupCollapsed && (isGroupRed || expandedGroupId === group.name);
          const redItemsCount = group.items.filter(
            (item) => item.status?.status === "not_working"
          ).length;
          const hasItems = group.items.length > 0;

              return (
                <div key={`${section.name}-${group.name}`} className="space-y-2.5 sm:space-y-2">
              {/* Group Tile */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => hasItems && handleGroupToggle(group)}
                  disabled={isUpdating || !hasItems}
                  className={`flex-1 p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 min-h-[64px] sm:min-h-[64px] shadow-sm active:scale-[0.98] ${
                    isGroupRed
                      ? "bg-red-600 hover:bg-red-700 active:bg-red-800 border-red-700 text-white shadow-red-500/20"
                      : "bg-green-600 hover:bg-green-700 active:bg-green-800 border-green-700 text-white shadow-green-500/20"
                  } ${isUpdating || !hasItems ? "opacity-50 cursor-not-allowed active:scale-100" : "cursor-pointer touch-manipulation"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-3 flex-1 min-w-0">
                      {hasItems ? (
                        isGroupRed ? (
                          <XCircle className="h-7 w-7 sm:h-6 sm:w-6 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-7 w-7 sm:h-6 sm:w-6 flex-shrink-0" />
                        )
                      ) : (
                        <div className="h-7 w-7 sm:h-5 sm:w-5 rounded-full border-2 border-white/50 flex-shrink-0" />
                      )}
                      <span className="font-bold text-lg sm:text-lg truncate">{group.name}</span>
                    </div>
                    {isGroupRed && hasItems && (
                      <span className="text-sm sm:text-base font-semibold opacity-95 flex-shrink-0">
                        {redItemsCount} issue{redItemsCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {!hasItems && (
                      <span className="text-xs sm:text-sm opacity-75 italic flex-shrink-0">
                        No items
                      </span>
                    )}
                  </div>
                </button>
                {/* Collapse/Expand Button for Groups */}
                {hasItems && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGroupToggle(group);
                    }}
                    className={`h-14 w-14 sm:h-12 sm:w-12 flex-shrink-0 ${
                      isGroupRed
                        ? "text-white hover:bg-red-700/50"
                        : "text-white hover:bg-green-700/50"
                    }`}
                  >
                    {isGroupCollapsed ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronUp className="h-5 w-5" />
                    )}
                  </Button>
                )}
              </div>

              {/* Expanded Sub-elements - Show if group is expanded and not collapsed */}
              {isGroupExpanded && (
                <div className="ml-3 sm:ml-4 space-y-2.5 sm:space-y-3 pt-2 border-l-3 sm:border-l-2 border-muted/50 pl-4 sm:pl-4">
                  {!hasItems && (
                    <p className="text-sm sm:text-sm text-muted-foreground italic p-3">
                      No items configured for this group
                    </p>
                  )}
                  {group.items.map((item) => {
                    const itemStatus = item.status?.status || "working";
                    const isItemRed = itemStatus === "not_working";

                    return (
                      <div key={item.id} id={`inspection-item-${item.id}`} className="space-y-2.5 sm:space-y-2">
                        {/* Sub-element Tile */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleItemToggle(item.id, false)}
                            disabled={isUpdating}
                            className={`flex-1 p-4 sm:p-4 rounded-xl border-2 transition-all duration-200 min-h-[56px] sm:min-h-[52px] shadow-sm active:scale-[0.98] ${
                              isItemRed
                                ? "bg-red-500 hover:bg-red-600 active:bg-red-700 border-red-600 text-white shadow-red-500/20"
                                : "bg-green-500 hover:bg-green-600 active:bg-green-700 border-green-600 text-white shadow-green-500/20"
                            } ${isUpdating ? "opacity-50 cursor-not-allowed active:scale-100" : "cursor-pointer touch-manipulation"}`}
                          >
                            <div className="flex items-center gap-3 sm:gap-3">
                              {isItemRed ? (
                                <XCircle className="h-6 w-6 sm:h-5 sm:w-5 flex-shrink-0" />
                              ) : (
                                <CheckCircle2 className="h-6 w-6 sm:h-5 sm:w-5 flex-shrink-0" />
                              )}
                              <span className="font-semibold text-base sm:text-base text-left flex-1">{item.item_name}</span>
                            </div>
                          </button>
                          {/* Collapse/Expand Button for Red Items */}
                          {isItemRed && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRedItemCollapse(item.id);
                              }}
                              className="h-12 w-12 sm:h-10 sm:w-10 flex-shrink-0"
                            >
                              {collapsedRedItems.has(item.id) ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronUp className="h-5 w-5" />
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Expanded Panel for Red Sub-elements - Collapsible when red */}
                        {isItemRed && !collapsedRedItems.has(item.id) && (
                          <div className="p-4 sm:p-4 border-2 border-red-300 dark:border-red-700 rounded-xl bg-red-50 dark:bg-red-950/30 space-y-4 sm:space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-sm">
                            {/* Notes */}
                            <div className="space-y-2.5 sm:space-y-2">
                              <Label className="text-base sm:text-base font-semibold text-foreground">Notes</Label>
                              <SpeechToTextInput
                                ref={(ref) => {
                                  if (ref) speechInputRefs.current[item.id] = ref;
                                }}
                                value={itemNotes[item.id] || ""}
                                onChange={(value) => handleNotesChange(item.id, value)}
                                onListeningChange={(isListening) => {
                                  setIsListeningToSpeech((prev) => ({ ...prev, [item.id]: isListening }));
                                }}
                                placeholder="Tap microphone to record or type here..."
                                hideMicButton={false}
                              />
                            </div>

                            {/* Camera Button */}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleCameraCapture(item.id)}
                              disabled={isUploadingImage[item.id]}
                              className="w-full h-12 sm:h-10 text-base sm:text-sm min-h-[48px] sm:min-h-[40px] font-medium shadow-sm active:scale-[0.98]"
                            >
                              {isUploadingImage[item.id] ? (
                                <>
                                  <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Camera className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                                  Take Photo
                                </>
                              )}
                            </Button>

                            {/* Images */}
                            {itemImages[item.id] && itemImages[item.id].length > 0 && (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
                                {itemImages[item.id].map((url, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={url}
                                      alt={`Issue ${index + 1}`}
                                      className="w-full h-48 sm:h-32 object-cover rounded-lg border-2 border-red-200 dark:border-red-800 shadow-sm"
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="absolute top-3 right-3 h-10 w-10 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-h-[40px] min-w-[40px] sm:min-h-[32px] sm:min-w-[32px] shadow-md active:scale-95"
                                      onClick={() => handleRemoveImage(item.id, index)}
                                    >
                                      <X className="h-5 w-5 sm:h-4 sm:w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}
            </div>
          ))}
        </div>
        
        {/* Signature and Agreement Section */}
        <div className="mt-6 sm:mt-8 pt-4 border-t space-y-4">
          <div className="space-y-4">
            <div>
              <Label className="text-base sm:text-base font-semibold mb-3 block">
                Driver Signature
              </Label>
              <SignaturePad
                onSave={(sig) => setSignature(sig)}
                label="Sign to confirm inspection completion"
              />
              {signature && (
                <div className="mt-2">
                  <img
                    src={signature}
                    alt="Driver signature"
                    className="h-20 w-full object-contain border rounded-lg bg-white p-2"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <Checkbox
                id="agreement"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <Label
                htmlFor="agreement"
                className="text-sm sm:text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I agree that I have completed the inspection to the best of my knowledge and have reported all issues found.
              </Label>
            </div>
          </div>

          {/* Complete Inspection Button */}
          <Button
            type="button"
            onClick={handleCompleteInspection}
            disabled={isCompleting || !signature || !agreed}
            size="lg"
            className="w-full h-12 sm:h-10 text-base sm:text-sm font-semibold shadow-lg active:scale-[0.98] min-h-[48px] sm:min-h-[40px]"
          >
            {isCompleting ? (
              <>
                <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                Complete Inspection
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

