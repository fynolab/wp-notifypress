#!/usr/bin/env bash
#
# Stages a release in the WordPress.org SVN repository.
#
#   pnpm svn:deploy             Build, sync trunk + assets, tag, show svn status.
#   pnpm svn:deploy --commit    Same, then commit to WordPress.org.
#
# The build is the same zip `pnpm run plugin-zip` produces, so SVN trunk only
# ever holds what .distignore / package.json "files" allow. .wordpress-org/
# (icons, banners, screenshots) goes to the top-level SVN assets/ directory,
# never into the plugin itself.
#
# The working copy lives outside this repo. Override its location with
# NOTIFYPRESS_SVN_DIR and the committing user with SVN_USERNAME.

set -euo pipefail

SLUG="notifypress"
SVN_URL="https://plugins.svn.wordpress.org/${SLUG}"
ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
SVN_DIR="${NOTIFYPRESS_SVN_DIR:-${HOME}/Documents/www/${SLUG}-svn}"
COMMIT=false

for arg in "$@"; do
	if [ "--commit" = "${arg}" ]; then
		COMMIT=true
	else
		echo "✖ Unknown option: ${arg}" >&2
		exit 1
	fi
done

if ! command -v svn > /dev/null; then
	echo "✖ svn not found. Install it with: brew install subversion" >&2
	exit 1
fi

cd "${ROOT}"
VERSION="$( node -p "require('./package.json').version" )"
ZIP="${ROOT}/${SLUG}-${VERSION}.zip"

# Check out (or refresh) the working copy. A 404 here means the plugin has not
# been approved yet, so there is no repository to deploy to.
if [ -d "${SVN_DIR}/.svn" ]; then
	echo "→ Updating ${SVN_DIR}"
	svn update --quiet "${SVN_DIR}"
else
	echo "→ Checking out ${SVN_URL} to ${SVN_DIR}"
	if ! svn checkout --quiet "${SVN_URL}" "${SVN_DIR}"; then
		echo "✖ Checkout failed. The SVN repository only exists once WordPress.org approves the plugin." >&2
		exit 1
	fi
fi

# The working copy is only a deploy mirror: drop anything a previous run
# staged, so a plain run followed by --commit starts from the server state.
svn revert --recursive --quiet "${SVN_DIR}"
svn cleanup --remove-unversioned "${SVN_DIR}"

if [ -e "${SVN_DIR}/tags/${VERSION}" ]; then
	echo "✖ tags/${VERSION} already exists. Bump the version first: pnpm version:bump <x.y.z>" >&2
	exit 1
fi

# Build the release zip (runs version:check) and unpack it.
echo "→ Building ${SLUG}-${VERSION}.zip"
pnpm run plugin-zip

BUILD_DIR="$( mktemp -d )"
trap 'rm -rf "${BUILD_DIR}"' EXIT
unzip -q "${ZIP}" -d "${BUILD_DIR}"

if [ ! -f "${BUILD_DIR}/${SLUG}/${SLUG}.php" ]; then
	echo "✖ ${ZIP} does not unzip to ${SLUG}/${SLUG}.php" >&2
	exit 1
fi

# Mirror the build into trunk and the listing assets into assets/.
echo "→ Syncing trunk and assets"
mkdir -p "${SVN_DIR}/trunk" "${SVN_DIR}/assets" "${SVN_DIR}/tags"
rsync -a --delete --exclude ".svn" "${BUILD_DIR}/${SLUG}/" "${SVN_DIR}/trunk/"
rsync -a --delete --exclude ".svn" "${ROOT}/.wordpress-org/" "${SVN_DIR}/assets/"

cd "${SVN_DIR}"

# Schedule new files for addition and vanished files for removal.
svn add --force --quiet trunk assets
svn status trunk assets | awk '/^!/ { sub( /^! +/, "" ); print }' | while IFS= read -r path; do
	svn delete --quiet "${path}@"
done

# Without a mime type WordPress.org serves listing images as downloads.
for file in assets/*; do
	if [ ! -f "${file}" ]; then
		continue
	fi

	case "${file}" in
		*.png)
			svn propset --quiet svn:mime-type image/png "${file}"
			;;
		*.jpg | *.jpeg)
			svn propset --quiet svn:mime-type image/jpeg "${file}"
			;;
		*.gif)
			svn propset --quiet svn:mime-type image/gif "${file}"
			;;
		*.svg)
			svn propset --quiet svn:mime-type image/svg+xml "${file}"
			;;
	esac
done

svn copy --quiet trunk "tags/${VERSION}"

echo
svn status
echo

if [ true != "${COMMIT}" ]; then
	echo "✔ ${VERSION} staged in ${SVN_DIR}. Review the status above, then run: pnpm svn:deploy --commit"
	echo "  (or commit by hand: cd ${SVN_DIR} && svn commit -m \"Release ${VERSION}\")"
	exit 0
fi

USER_ARGS=()
if [ -n "${SVN_USERNAME:-}" ]; then
	USER_ARGS=( --username "${SVN_USERNAME}" )
fi

svn commit "${USER_ARGS[@]+"${USER_ARGS[@]}"}" -m "Release ${VERSION}"
echo "✔ Released ${VERSION} to ${SVN_URL}"
