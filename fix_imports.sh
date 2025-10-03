#!/bin/bash
# Bulk rename deprecated CFP type names to new unified types

set -e

DRY_RUN="${1:-dry-run}"

# Find all Python files that import the old types
FILES=$(grep -rl "CFPAnalysisResult\|CFPSectionAnalysis\|CategorizationAnalysisResult" \
  services/rag/src \
  services/rag/tests \
  services/backend/tests \
  --include="*.py" 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "No files found with deprecated type names"
  exit 0
fi

echo "Found files with deprecated types:"
echo "$FILES" | while read -r file; do
  echo "  - $file"
done
echo ""

if [ "$DRY_RUN" = "dry-run" ]; then
  echo "=== DRY RUN - Showing changes that would be made ==="
  echo ""

  for file in $FILES; do
    echo "📄 $file"
    echo "----------------------------------------"

    # Show lines that would change
    grep -n "CFPAnalysisResult\|CFPSectionAnalysis\|CategorizationAnalysisResult" "$file" | head -20
    echo ""
  done

  echo "=== Run with 'apply' to make changes ==="
  echo "Usage: ./fix_imports.sh apply"

elif [ "$DRY_RUN" = "apply" ]; then
  echo "=== APPLYING CHANGES ==="
  echo ""

  for file in $FILES; do
    echo "🔧 Fixing $file"

    # Use sed to replace deprecated names ONLY in import lines
    # macOS compatible sed syntax
    sed -i '' \
      -e '/from packages\.db\.src\.json_objects import/s/CFPAnalysisResult/CFPAnalysis/g' \
      -e '/from packages\.db\.src\.json_objects import/s/CFPSectionAnalysis/CFPAnalysis/g' \
      -e '/from packages\.db\.src\.json_objects import/s/CategorizationAnalysisResult/CFPAnalysisData/g' \
      -e 's/: CFPAnalysisResult/: CFPAnalysis/g' \
      -e 's/\[CFPAnalysisResult\]/[CFPAnalysis]/g' \
      -e 's/(CFPAnalysisResult/(CFPAnalysis/g' \
      -e 's/"CFPAnalysisResult"/"CFPAnalysis"/g' \
      -e 's/'\''CFPAnalysisResult'\''/'\''CFPAnalysis'\''/g' \
      -e 's/-> CFPAnalysisResult/-> CFPAnalysis/g' \
      -e 's/: CFPSectionAnalysis/: CFPAnalysis/g' \
      -e 's/\[CFPSectionAnalysis\]/[CFPAnalysis]/g' \
      -e 's/(CFPSectionAnalysis/(CFPAnalysis/g' \
      -e 's/-> CFPSectionAnalysis/-> CFPAnalysis/g' \
      "$file"
  done

  echo ""
  echo "✅ All files updated!"
  echo ""
  echo "Modified files:"
  echo "$FILES"

else
  echo "Unknown option: $DRY_RUN"
  echo "Usage: ./fix_imports.sh [dry-run|apply]"
  exit 1
fi
