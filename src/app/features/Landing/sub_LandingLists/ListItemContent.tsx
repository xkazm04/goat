import { Clock, Hash, Calendar } from "lucide-react";
import { TopList } from "@/types/top-lists";

interface ListItemContentProps {
  list: TopList;
  createdDate: string;
  /** Whether to add cursor-pointer class (for popover wrapper) */
  cursorPointer?: boolean;
}

/**
 * Renders the main content area of a list item: title, subcategory, size badge, time period, and date.
 * Extracted to eliminate duplication between popover-wrapped and non-wrapped versions.
 */
export const ListItemContent = ({
  list,
  createdDate,
  cursorPointer = false,
}: ListItemContentProps) => {
  return (
    <div className={`flex-1 min-w-0${cursorPointer ? " cursor-pointer" : ""}`}>
      <h4
        className="text-sm font-semibold text-white truncate group-hover:text-white/90 transition-colors"
        data-testid={`user-list-title-${list.id}`}
      >
        {list.title}
      </h4>
      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
        {list.subcategory && (
          <span className="text-slate-400">{list.subcategory}</span>
        )}
        <div className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          <span>Top {list.size}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span className="capitalize">
            {list.time_period?.replace("-", " ") || "all time"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{createdDate}</span>
        </div>
      </div>
    </div>
  );
};
