# Roster Performance and Direct Navigation Design

**Status:** Approved in chat on 2026-08-26; awaiting written-spec review.

## Goal

Make every sidebar destination immediately reachable from any screen, including a saved-analysis detail view, and extend New Analysis with an optional full-roster workbook that powers an Overview performance module.

## Scope

This milestone includes:

- Direct sidebar navigation between Overview, New analysis, History, and Officers.
- A third, optional `.xlsx` roster upload in New Analysis.
- Roster parsing, identity matching, activity aggregation, combined scoring, and automatic performance grouping.
- An Overview module with Developing, Steady, and Top performer sections.
- Sorting by combined score, validated hours, completed opportunities, or name.
- Persistence of roster-derived results when an analysis is saved to History.

Officer invitation and membership-management functionality remains outside this milestone. The Officers destination continues to show its existing placeholder, but it must be directly reachable from every screen.

## Navigation Behavior

The page owns one navigation action, `navigate(tab)`, for all sidebar buttons. Selecting any tab clears the saved-analysis detail ID before activating the destination. This prevents the detail view from taking precedence over the sidebar selection.

- Overview shows the current session analysis and its performance module when roster data exists.
- New analysis opens the upload modal from any screen.
- History shows the saved-analysis list from any screen.
- Officers shows the placeholder from any screen.
- The Back to History control remains available inside a detail view but is no longer required to leave it.

## Roster Workbook Contract

The roster is a separate optional workbook in the New Analysis form. It uses the same `.xlsx` and 10 MiB constraints as the two existing reports.

The parser searches workbook sheets for a header row containing a student-name column. Supported aliases include `Volunteer Name`, `Student Name`, `Name`, and `Full Name`. Email is preferred and supports aliases including `Volunteer Email`, `Email`, `Email Address`, and `Student Email`. Rows without a name are ignored. Duplicate roster rows are merged by normalized email when present, otherwise by normalized name.

If no usable name column or no student rows are found, the request returns an actionable roster validation issue. The two existing reports remain required; the roster remains optional so the existing analysis workflow continues to work unchanged.

## Identity Matching and Activity Totals

Roster students are matched to normalized Team Report history rows by normalized email first and normalized name second. Matching is case-insensitive and trims whitespace.

For every roster student:

- `validatedHours` is the sum of validated Team Report hours within the selected school year.
- `completedOpportunities` is the count of distinct completed/validated opportunity records within the selected school year. Duplicate records with the same opportunity ID are counted once; when no ID exists, the fallback key is normalized event name plus event date.
- Students with no matching Team Report activity receive zero hours and zero completed opportunities.
- Ambiguous name-only matches remain unmatched and receive a warning rather than combining two people incorrectly.

## Combined Performance Score

The performance score is data-driven and requires no user-defined thresholds.

1. Determine the maximum validated hours and maximum completed-opportunity count across the uploaded roster.
2. For each student, calculate:
   - `hoursComponent = maximumHours > 0 ? validatedHours / maximumHours : 0`
   - `opportunitiesComponent = maximumOpportunities > 0 ? completedOpportunities / maximumOpportunities : 0`
3. Calculate `combinedScore = roundToHundredths(100 * ((hoursComponent + opportunitiesComponent) / 2))`.

Hours and completed opportunities have equal weight. Scores range from 0 to 100. A zero maximum contributes zero instead of dividing by zero.

## Automatic Performance Groups

Groups use the actual combined-score distribution rather than forcing equal population sizes.

1. Sort all combined scores ascending.
2. Determine the lower and upper tercile boundaries using nearest-rank percentiles at 33.33% and 66.67%.
3. Keep all identical scores in the same group even when a tie crosses a tercile boundary.

Classification rules:

- If every combined score is zero, every student is `developing`.
- If every combined score is the same non-zero value, every student is `steady`.
- Otherwise, scores at or below the lower boundary are `developing`, scores at or above the upper boundary are `top`, and remaining scores are `steady`.
- When only two distinct scores exist, the lower score is `developing` and the higher score is `top`; an empty Steady section is valid.

This means a roster with 50% zero-activity students keeps all zero-activity students together in Developing instead of distributing them artificially across groups.

## Overview Performance Module

The module appears below the existing analysis summary only when roster-derived performance data is present. It contains:

- Summary counts for Developing, Steady, and Top performers.
- A sort control with Combined score, Validated hours, Completed opportunities, and Name.
- Three independently labeled sections using the same selected sort order.
- Each student row shows name, email when available, validated hours rounded to hundredths, completed opportunities, combined score, and group label.
- Empty sections remain visible with explanatory copy so the distribution is not misleading.

The default sort is combined score descending. Hours, opportunities, and combined score sort descending; name sorts ascending. Sorting changes display order only and never changes group membership.

## API and Data Model

The New Analysis request adds an optional `rosterReport` multipart file. The analysis service result adds an optional `performance` object:

```ts
type PerformanceGroup = "developing" | "steady" | "top";

type PerformanceStudent = {
  volunteerKey: string;
  name: string;
  email: string | null;
  validatedHours: number;
  completedOpportunities: number;
  combinedScore: number;
  group: PerformanceGroup;
  warnings: string[];
};

type PerformanceResult = {
  students: PerformanceStudent[];
  summary: { developing: number; steady: number; top: number };
  boundaries: { lower: number; upper: number } | null;
};
```

Unsaved responses return this data in the existing analysis payload. New saved analyses store a versioned object in `results_json`: `{ snapshotVersion: 2, volunteers, performance }`. The repository continues to read legacy rows whose `results_json` value is the original volunteers array, treating their performance data as absent. History detail therefore renders the original groups and scores without recalculating them later while remaining compatible with existing records.

When a roster workbook is saved, it is stored as a third private R2 upload with kind `roster_report`. The `analyses` table gains a nullable `roster_upload_id` column. Save cleanup covers all source objects written during the request, and existing saved analyses with a null roster upload remain valid.

## Error Handling

- Missing roster: continue with the existing two-report analysis and omit the performance module.
- Invalid roster extension or size: reject before workbook parsing with a roster-specific issue.
- Missing roster headers or usable rows: reject with the sheet and expected fields where available.
- Duplicate roster identity: merge exact identity matches and surface warnings when conflicting names/emails appear.
- Missing Team Report match: retain the roster student with zero activity; this is expected, not an error.
- Storage failure while saving: clean up all uploaded R2 objects, including the optional roster object, and do not write a partial analysis.

## Testing and Acceptance

Unit tests cover roster header aliases, duplicate merging, email/name matching, distinct opportunity counting, score normalization, zero-only rosters, 50%-zero distributions, all-equal non-zero scores, two-score distributions, ties at tercile boundaries, and deterministic sorting.

API tests cover optional roster behavior, invalid roster validation, roster-inclusive saved analyses, and cleanup of the third upload on failure. Rendered-surface tests cover direct sidebar navigation and the three performance sections.

Acceptance requires:

- Clicking any sidebar destination from a History detail screen immediately opens that destination.
- Existing two-workbook analysis still works without a roster.
- Uploading a valid roster includes students with zero activity.
- A 50%-zero roster keeps all zero-activity students in Developing.
- Users can sort the displayed groups by hours, opportunities, combined score, or name without changing membership.
- Saved History detail preserves the roster performance snapshot.
