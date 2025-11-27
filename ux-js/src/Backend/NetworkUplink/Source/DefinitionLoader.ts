import { Octokit } from "@octokit/core";
import { Boundaries, validateBoundaries } from "./Parsers/BoundaryParser";
import { parseMainDefs, StationList } from "./Parsers/MainParser";
import { Tracon, validateTracon } from "./Parsers/TraconParser";

interface VatspyMeta {
    timestamp: number,
    main_sha: string | undefined,
    boundary_sha: string | undefined,
}

interface LocalMeta {
    timestamp: number,
    main_file: string,
    boundary_file: string,
    tracon_file: string,
}

const localBaseUrl = 'https://vatsim-stations.kantraksel.workers.dev/';

class DefinitionLoader {
    private vatspyMeta: VatspyMeta | undefined;
    private vatspyMetaPromise: Promise<VatspyMeta> | undefined;
    private localMeta: LocalMeta | undefined;
    private localMetaPromise: Promise<LocalMeta> | undefined;
    private octokit = new Octokit();

    public async loadDefinitions(): Promise<[StationList, Boundaries, Tracon]> {
        console.info('Loading definition files');
        const meta = await db.getDefinitionMeta();
        const nextUpdate = meta.lastUpdateCheck + 24 * 3600 * 1000;
        const checkUpdate = nextUpdate <= Date.now();
        console.info(`Next definition update on ${new Date(nextUpdate)}`);

        const defs = await db.getDefinitions();
        let result;
        if (!checkUpdate) {
            if (defs.main && defs.boundaries && defs.tracons) {
                console.info('Loaded definition files from db');
                return [defs.main, defs.boundaries, defs.tracons];
            }
            console.info('Fetching missing definition files');
            result = await Promise.all([
                this.processMainDefs(defs.main),
                this.processBoundaryDefs(defs.boundaries),
                this.processTraconDefs(defs.tracons),
            ]);
        } else {
            console.info('Fetching definition files');
            result = await Promise.all([
                this.processMainDefs(defs.main, meta.mainDefsUpdate),
                this.processBoundaryDefs(defs.boundaries, meta.boundaryDefsUpdate),
                this.processTraconDefs(defs.tracons, meta.traconDefsUpdate),
            ]);
        }
        db.updateLastUpdateCheck(Date.now());
        console.info('Updated definition files');

        this.vatspyMeta = undefined;
        this.vatspyMetaPromise = undefined;
        this.localMeta = undefined;
        this.localMetaPromise = undefined;
        return result;
    }

    private async processMainDefs(defs?: StationList, timestamp?: number) {
        if (timestamp === undefined && defs) {
            return defs;
        }
        const result = await this.fetchMainDefs(timestamp ?? 0);
        if (!result) {
            if (timestamp && defs) {
                return defs;
            }
            throw new Error('Failed to get VATSpy.dat');
        }
        return result;
    }

    private async fetchMainDefs(timestamp: number) {
        let data;
        try {
            const originMeta = await this.getVatspyMeta();
            const localMeta = await this.getLocalMeta();

            if (timestamp >= originMeta.timestamp && timestamp >= localMeta.timestamp) {
                console.info('VATSpy.dat is up to date');
                return;
            }

            if (originMeta.timestamp > localMeta.timestamp && originMeta.main_sha) {
                timestamp = originMeta.timestamp;
                try {
                    data = await this.fetchGithubFile('vatsimnetwork', 'vatspy-data-project', originMeta.main_sha);
                    console.info(`Downloaded VATSpy.dat from GitHub - last updated on ${new Date(originMeta.timestamp)}`);
                } catch (e: unknown) {
                    console.error('Failed to fetch VATSpy.dat from GitHub:');
                    console.error(e);
                }
            }
            if (!data) {
                const response = await fetch(`${localBaseUrl}${localMeta.main_file}`, { cache: 'default' });
                data = await response.text();
                timestamp = localMeta.timestamp;
                console.info(`Downloaded VATSpy.dat from cache site - last updated on ${new Date(localMeta.timestamp)}`);
            }
        } catch (e: unknown) {
            console.error('Failed to fetch VATSpy.dat:');
            console.error(e);
            return;
        }
        
        const obj = parseMainDefs(data);
        await db.updateMainDefs(obj, timestamp);
        return obj;
    }

    private async processBoundaryDefs(defs?: Boundaries, timestamp?: number) {
        if (timestamp === undefined && defs) {
            return defs;
        }
        const result = await this.fetchBoundaryDefs(timestamp ?? 0);
        if (!result) {
            if (timestamp && defs) {
                return defs;
            }
            throw new Error('Failed to get Boundaries.geojson');
        }
        return result;
    }

    private async fetchBoundaryDefs(timestamp: number) {
        let data;
        try {
            const originMeta = await this.getVatspyMeta();
            const localMeta = await this.getLocalMeta();

            if (timestamp >= originMeta.timestamp && timestamp >= localMeta.timestamp) {
                console.info('Boundaries.geojson is up to date');
                return;
            }

            if (originMeta.timestamp > localMeta.timestamp && originMeta.boundary_sha) {
                timestamp = originMeta.timestamp;
                try {
                    const response = await this.fetchGithubFile('vatsimnetwork', 'vatspy-data-project', originMeta.boundary_sha);
                    data = JSON.parse(response) as Boundaries;
                    console.info(`Downloaded Boundaries.geojson from GitHub - last updated on ${new Date(originMeta.timestamp)}`);
                } catch (e: unknown) {
                    console.error('Failed to fetch Boundaries.geojson from GitHub:');
                    console.error(e);
                }
            }
            if (!data) {
                const response = await fetch(`${localBaseUrl}${localMeta.boundary_file}`, { cache: 'default' });
                data = await response.json() as Boundaries;
                timestamp = localMeta.timestamp;
                console.info(`Downloaded Boundaries.geojson from cache site - last updated on ${new Date(localMeta.timestamp)}`);
            }
        } catch (e: unknown) {
            console.error('Failed to fetch Boundaries.geojson:');
            console.error(e);
            return;
        }
        
        validateBoundaries(data);
        await db.updateBoundaryDefs(data, timestamp);
        return data;
    }

    private async processTraconDefs(defs?: Tracon, timestamp?: number) {
        if (timestamp === undefined && defs) {
            return defs;
        }
        const result = await this.fetchTraconDefs(timestamp ?? 0);
        if (!result) {
            if (timestamp && defs) {
                return defs;
            }
            throw new Error('Failed to get TRACONBoundaries.geojson');
        }
        return result;
    }

    private async fetchTraconDefs(timestamp: number) {
        let data;
        try {
            console.warn('TRACONBoundaries.geojson download is not available on GitHub due to API limitations');
            const localMeta = await this.getLocalMeta();

            if (timestamp >= localMeta.timestamp) {
                console.info('TRACONBoundaries.geojson is up to date');
                return;
            }

            const response = await fetch(`${localBaseUrl}${localMeta.tracon_file}`, { cache: 'default' });
            data = await response.json() as Tracon;
            timestamp = localMeta.timestamp;
            console.info(`Downloaded TRACONBoundaries.geojson from cache site - last updated on ${new Date(localMeta.timestamp)}`);
        } catch (e: unknown) {
            console.error('Failed to fetch TRACONBoundaries.geojson:');
            console.error(e);
            return;
        }
        
        validateTracon(data);
        await db.updateTraconDefs(data, timestamp);
        return data;
    }

    private async getLocalMeta() {
        if (this.localMeta) {
            return this.localMeta;
        }
        if (this.localMetaPromise) {
            return await this.localMetaPromise;
        }

        this.localMetaPromise = this.fetchLocalMeta();
        this.localMeta = await this.localMetaPromise;
        this.localMetaPromise = undefined;
        return this.localMeta;
    }

    private async fetchLocalMeta() {
        const response = await fetch(`${localBaseUrl}release.json`, { cache: 'default' });
        const obj = await response.json() as Omit<LocalMeta, 'timestamp'> & { timestamp: string };
        const timestamp = new Date(obj.timestamp).getTime();
        return {
            timestamp,
            main_file: obj.main_file,
            boundary_file: obj.boundary_file,
            tracon_file: obj.tracon_file,
        };
    }

    private async getVatspyMeta() {
        if (this.vatspyMeta) {
            return this.vatspyMeta;
        }
        if (this.vatspyMetaPromise) {
            return await this.vatspyMetaPromise;
        }
        
        this.vatspyMetaPromise = this.fetchVatspyMeta();
        this.vatspyMeta = await this.vatspyMetaPromise;
        this.vatspyMetaPromise = undefined;
        return this.vatspyMeta;
    }

    private async fetchVatspyMeta() {
        const branch = await this.octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
            owner: 'vatsimnetwork',
            repo: 'vatspy-data-project',
            branch: 'master',
        });
        const tree = await this.octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
            owner: 'vatsimnetwork',
            repo: 'vatspy-data-project',
            tree_sha: branch.data.commit.sha,
        });
        const boundaryFile = tree.data.tree.find(value => value.path === 'Boundaries.geojson');
        const vatspyFile = tree.data.tree.find(value => value.path === 'VATSpy.dat');

        const commit = branch.data.commit.commit;
        let commitDate;
        if (commit.committer?.date) {
            commitDate = new Date(commit.committer.date).getTime();
        } else if (commit.author?.date) {
            commitDate = new Date(commit.author.date).getTime();
        } else {
            commitDate = Date.now();
        }
        return { timestamp: commitDate, main_sha: vatspyFile?.sha, boundary_sha: boundaryFile?.sha };
    }

    // @ts-ignore
    private async fetchSimawareMeta() {
        const meta = await this.octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
            owner: 'vatsimnetwork',
            repo: 'simaware-tracon-project',
        });
        const file = meta.data.assets.find(value => value.name === 'TRACONBoundaries.geojson');

        let updateDate;
        if (meta.data.updated_at) {
            updateDate = new Date(meta.data.updated_at).getTime();
        } else {
            updateDate = new Date(meta.data.created_at).getTime();
        }
        return { date: updateDate, url: file?.browser_download_url };
    }

    private async fetchGithubFile(owner: string, repo: string, file_sha: string) {
        const response = await this.octokit.request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', {
            owner,
            repo,
            file_sha,
            mediaType: {
                format: 'raw',
            },
        });
        return response.data as unknown as string;
    }
}
export default DefinitionLoader;
