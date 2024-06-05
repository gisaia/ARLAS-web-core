#!/bin/bash

echo "Fetching licences of"
mkdir -p build/npm-licences/

tmp_file="build/npm-licences/tmp.csv"
report_file="build/npm-licences/dependencies-licence-core.csv"
npx npm-license-crawler --onlyDirectDependencies --csv $tmp_file

# Create report file
echo "libId,version,moduleUrl,moduleLicense,description" > $report_file
# Split module name in lib and version
while IFS="," read -r module licenses repository licenseUrl parents
  do
    lib=${module%@*}\"
    description=\"$(grep -o '"description": "[^"]*' "node_modules/$(echo $lib | sed 's/"//g')/package.json" | grep -o '[^"]*$')\"
    version=\"${module##*@}
    echo "$lib,$version,$repository,$licenses,$description" >> $report_file
  done < <(tail -n +2 ${tmp_file})

rm $tmp_file
