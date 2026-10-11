#!/usr/bin/env node
/**
 * Keeps the plugin version in step across the files that declare it, and
 * names the release zip after it.
 *
 *   node bin/version.mjs check          Fail if the versions disagree.
 *   node bin/version.mjs bump <x.y.z>   Set the version everywhere.
 *   node bin/version.mjs rename-zip     notifypress.zip -> notifypress-<x.y.z>.zip
 *
 * package.json is the source of truth. WordPress reads the plugin header and
 * WordPress.org reads the readme's Stable tag, so all three must match.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const SEMVER = /^\d+\.\d+\.\d+$/;

/**
 * Every place the version is declared, with how to read and replace it.
 */
const sources = [
	{
		file: 'package.json',
		pattern: /^(\s*"version":\s*")([^"]+)(")/m,
	},
	{
		file: 'notifypress.php',
		pattern: /^(\s*\*\s*Version:\s*)(\S+)()/m,
	},
	{
		file: 'readme.txt',
		pattern: /^(Stable tag:\s*)(\S+)()/m,
	},
];

function fail( message ) {
	console.error( `✖ ${ message }` );
	process.exit( 1 );
}

function read( file ) {
	return readFileSync( join( root, file ), 'utf8' );
}

function versionIn( source ) {
	const match = read( source.file ).match( source.pattern );

	if ( ! match ) {
		fail( `No version found in ${ source.file }.` );
	}

	return match[ 2 ];
}

function packageVersion() {
	return versionIn( sources[ 0 ] );
}

function hasChangelogEntry( version ) {
	return read( 'readme.txt' ).includes( `= ${ version } =` );
}

function check() {
	const found = sources.map( ( source ) => {
		return { file: source.file, version: versionIn( source ) };
	} );
	const expected = found[ 0 ].version;
	const mismatched = found.filter( ( entry ) => {
		return entry.version !== expected;
	} );

	if ( mismatched.length > 0 ) {
		const lines = found.map( ( entry ) => {
			return `  ${ entry.file }: ${ entry.version }`;
		} );

		fail(
			`Version mismatch:\n${ lines.join( '\n' ) }\nRun: pnpm version:bump ${ expected }`
		);
	}

	if ( ! hasChangelogEntry( expected ) ) {
		console.warn(
			`⚠ readme.txt has no "= ${ expected } =" changelog entry.`
		);
	}

	console.log( `✔ Version ${ expected } matches in ${ found.length } files.` );
}

function bump( version ) {
	if ( ! version || ! SEMVER.test( version ) ) {
		fail( 'Usage: pnpm version:bump <major.minor.patch>, e.g. 1.1.2' );
	}

	sources.forEach( ( source ) => {
		const contents = read( source.file );

		if ( ! source.pattern.test( contents ) ) {
			fail( `No version found in ${ source.file }.` );
		}

		writeFileSync(
			join( root, source.file ),
			contents.replace( source.pattern, `$1${ version }$3` )
		);
		console.log( `✔ ${ source.file } → ${ version }` );
	} );

	if ( ! hasChangelogEntry( version ) ) {
		console.warn(
			`⚠ Add a "= ${ version } =" entry to the readme.txt changelog.`
		);
	}
}

function renameZip() {
	const from = join( root, 'notifypress.zip' );
	const name = `notifypress-${ packageVersion() }.zip`;

	if ( ! existsSync( from ) ) {
		fail( 'notifypress.zip not found. Run wp-scripts plugin-zip first.' );
	}

	// Only the archive is renamed: it must still unzip to notifypress/, which
	// is how WordPress recognises an upload as an update to this plugin.
	renameSync( from, join( root, name ) );
	console.log( `✔ ${ name }` );
}

const [ command, argument ] = process.argv.slice( 2 );

if ( 'check' === command ) {
	check();
} else if ( 'bump' === command ) {
	bump( argument );
} else if ( 'rename-zip' === command ) {
	renameZip();
} else {
	fail( 'Usage: node bin/version.mjs <check|bump <x.y.z>|rename-zip>' );
}
