#!/bash
NODE=/home/jules/.nvm/versions/node/v24.0.1/bin/node
${NODE} ./js/loader.js --sourcefiles="${SOURCES}" --source="${SOURCE}" --targetdir="${TARGET_DIR}"
