import {
  Activity,
  BriefcaseBusiness,
  Dumbbell,
  FolderKanban,
  Moon,
  Sparkles,
  Type,
} from "lucide-react";
import type { TaskCategory } from "../../types/daymark";
import { taskCategoryLabels } from "../../utils/daymarkUtils";

const categoryIconMap = {
  english: Type,
  exercise: Dumbbell,
  other: Sparkles,
  personal: Activity,
  project: FolderKanban,
  sleep: Moon,
  work: BriefcaseBusiness,
} satisfies Record<TaskCategory, typeof Activity>;

export function CategoryBadge({ category }: { category: TaskCategory }) {
  const Icon = categoryIconMap[category];

  return (
    <span className={`daymark-category-badge daymark-category-${category}`}>
      <Icon aria-hidden="true" size={14} />
      <span>{taskCategoryLabels[category]}</span>
    </span>
  );
}
