#!/bin/bash

# --- Configuration for mount points ---
MOUNT_POINT_JULES="/mnt/audio5"
MOUNT_POINT_WWW="/mnt/www"
MOUNT_POINT_BACKUPS="/mnt/backups"

# --- Functions ---
is_mounted() {
    mount | grep -q "$1"
}

# --- Main Script Logic ---
# Check initial state and store in flags
INITIAL_MOUNTED_JULES=1
if ! is_mounted "${MOUNT_POINT_JULES}"; then
    INITIAL_MOUNTED_JULES=0
fi

INITIAL_MOUNTED_WWW=1
if ! is_mounted "${MOUNT_POINT_WWW}"; then
    INITIAL_MOUNTED_WWW=0
fi

INITIAL_MOUNTED_BACKUPS=1
if ! is_mounted "${MOUNT_POINT_BACKUPS}"; then
    INITIAL_MOUNTED_BACKUPS=0
fi

# Mount any drives that were not initially mounted
if [[ ${INITIAL_MOUNTED_JULES} -eq 0 ]] || [[ ${INITIAL_MOUNTED_WWW} -eq 0 ]] || [[ ${INITIAL_MOUNTED_BACKUPS} -eq 0 ]]; then
    echo "Mounting required drives..."
    /home/jules/mnt_audio5
fi

# Do the work by invoking the other script
echo "Invoking ./update.sh to do the work..."
./update.sh

# Unmount only the drives that were not mounted initially
if [[ ${INITIAL_MOUNTED_JULES} -eq 0 ]]; then
    echo "Unmounting ${MOUNT_POINT_JULES}..."
    umount "${MOUNT_POINT_JULES}"
fi
if [[ ${INITIAL_MOUNTED_WWW} -eq 0 ]]; then
    echo "Unmounting ${MOUNT_POINT_WWW}..."
    umount "${MOUNT_POINT_WWW}"
fi
if [[ ${INITIAL_MOUNTED_BACKUPS} -eq 0 ]]; then
    echo "Unmounting ${MOUNT_POINT_BACKUPS}..."
    umount "${MOUNT_POINT_BACKUPS}"
fi
