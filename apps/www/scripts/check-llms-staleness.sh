#!/usr/bin/env bash
# check-llms-staleness.sh
#
# Warns when a marketing page source file is modified in a PR but the
# corresponding LLM .txt file has not been updated in the same PR.
#
# Usage:
#   bash apps/www/scripts/check-llms-staleness.sh          # uses git diff vs origin/master
#   git diff --name-only origin/master...HEAD | bash apps/www/scripts/check-llms-staleness.sh

set -euo pipefail

# Read changed files from stdin if piped, otherwise fall back to git diff.
if [ -t 0 ]; then
  changed=$(git diff --name-only origin/master...HEAD 2>/dev/null || true)
else
  changed=$(cat)
fi

warned=0

# changed_includes <regex>
# Returns 0 if any changed file matches the regex anchored at the start of line.
changed_includes() {
  echo "$changed" | grep -qE "^${1}" 2>/dev/null
}

# warn_if_stale <txt_file> <display_label> <match_regex>
# Prints a warning when display_label is changed but txt_file is not.
warn_if_stale() {
  local txt_file="$1"
  local display_label="$2"
  local match_regex="$3"

  if changed_includes "$match_regex" && ! changed_includes "$txt_file"; then
    echo "  WARNING: ${display_label} was modified but ${txt_file} was not updated."
    echo "           Please check if the LLM content needs updating."
    warned=1
  fi
}

# Page and data-file -> txt mappings
warn_if_stale \
  "apps/www/public/llms/database.txt" \
  "apps/www/pages/database.tsx" \
  "apps/www/pages/database\\.tsx"

warn_if_stale \
  "apps/www/public/llms/database.txt" \
  "apps/www/data/products/database/" \
  "apps/www/data/products/database/"

warn_if_stale \
  "apps/www/public/llms/auth.txt" \
  "apps/www/pages/auth.tsx" \
  "apps/www/pages/auth\\.tsx"

warn_if_stale \
  "apps/www/public/llms/storage.txt" \
  "apps/www/pages/storage.tsx" \
  "apps/www/pages/storage\\.tsx"

warn_if_stale \
  "apps/www/public/llms/edge-functions.txt" \
  "apps/www/pages/edge-functions.tsx" \
  "apps/www/pages/edge-functions\\.tsx"

warn_if_stale \
  "apps/www/public/llms/edge-functions.txt" \
  "apps/www/data/products/functions/" \
  "apps/www/data/products/functions/"

warn_if_stale \
  "apps/www/public/llms/realtime.txt" \
  "apps/www/pages/realtime.tsx" \
  "apps/www/pages/realtime\\.tsx"

warn_if_stale \
  "apps/www/public/llms/vector.txt" \
  "apps/www/pages/modules/vector.tsx" \
  "apps/www/pages/modules/vector\\.tsx"

warn_if_stale \
  "apps/www/public/llms/vector.txt" \
  "apps/www/data/products/modules/vector.*" \
  "apps/www/data/products/modules/vector\\."

warn_if_stale \
  "apps/www/public/llms/homepage.txt" \
  "apps/www/pages/index.tsx" \
  "apps/www/pages/index\\.tsx"

warn_if_stale \
  "apps/www/public/llms/homepage.txt" \
  "apps/www/data/home/" \
  "apps/www/data/home/"

# Pricing sources are auto-generated — remind to re-run the generation script.
check_pricing_stale() {
  local display_label="$1"
  local match_regex="$2"

  if changed_includes "$match_regex" && ! changed_includes "apps/www/public/llms/pricing\\.txt"; then
    echo "  WARNING: ${display_label} was modified but apps/www/public/llms/pricing.txt was not updated."
    echo "           pricing.txt is auto-generated. Run: node apps/www/scripts/generateLlmsPricing.mjs"
    warned=1
  fi
}

check_pricing_stale "packages/shared-data/plans.ts"        "packages/shared-data/plans\\.ts"
check_pricing_stale "packages/shared-data/pricing.ts"      "packages/shared-data/pricing\\.ts"
check_pricing_stale "apps/www/data/PricingAddOnTable.json"  "apps/www/data/PricingAddOnTable\\.json"

if [ "$warned" -eq 1 ]; then
  echo ""
  echo "  These warnings are non-blocking. Update the .txt files if the LLM content"
  echo "  needs to reflect these changes, then re-run this check."
fi

# Always exit 0 — this is a warning-only check.
exit 0
