#!/bin/bash

# Copy API client files
npx rimraf src/api
mkdir -p src/api
cp -r ../crewdo-backend/generated-clients/typescript-axios/*.ts ../crewdo-backend/generated-clients/typescript-axios/api ../crewdo-backend/generated-clients/typescript-axios/models src/api/

# Add TypeScript nocheck comment to all .ts files
for file in $(find src/api -name "*.ts"); do
    # Create a temporary file with the @ts-nocheck comment
    temp_file=$(mktemp)
    head -n 1 "$file" > "$temp_file"
    echo "// @ts-nocheck" >> "$temp_file"
    tail -n +2 "$file" >> "$temp_file"
    mv "$temp_file" "$file"
done

echo "✅ API client copied successfully with TypeScript suppressions!"