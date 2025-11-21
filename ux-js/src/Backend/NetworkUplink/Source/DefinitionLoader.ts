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

class DefinitionLoader {
    private vatspyMeta: VatspyMeta | undefined;
    private vatspyMetaPromise: Promise<VatspyMeta> | undefined;
    private localMeta: LocalMeta | undefined;
    private localMetaPromise: Promise<LocalMeta> | undefined;
    private octokit = new Octokit();

    public async loadDefinitions() {
        const defs = await db.getDefinitions();
        return await Promise.all([
            this.processMainDefs(defs.main),
            this.processBoundaryDefs(defs.boundaries),
            this.processTraconDefs(defs.tracons),
        ]);
    }

    private async processMainDefs(main: StationList | undefined) {
        if (main) {
            return main;
        }
        const meta = await this.getVatspyMeta();
        const localMeta = await this.getLocalMeta();

        let data;
        let updateTimestamp;
        if (meta.timestamp > localMeta.timestamp && meta.main_sha) {
            data = await this.fetchGithubFile('vatsimnetwork', 'vatspy-data-project', meta.main_sha);
            updateTimestamp = meta.timestamp;
        } else {
            const response = await fetch(localMeta.main_file, { cache: 'default' });
            data = await response.text();
            updateTimestamp = localMeta.timestamp;
        }
        const obj = parseMainDefs(data);
        await db.updateMainDefs(obj, updateTimestamp);
        return obj;
    }

    private async processBoundaryDefs(boundaries: Boundaries | undefined) {
        if (boundaries) {
            return boundaries;
        }
        const meta = await this.getVatspyMeta();
        const localMeta = await this.getLocalMeta();

        let data;
        let updateTimestamp;
        if (meta.timestamp > localMeta.timestamp && meta.boundary_sha) {
            const response = await this.fetchGithubFile('vatsimnetwork', 'vatspy-data-project', meta.boundary_sha);
            data = JSON.parse(response) as Boundaries;
            updateTimestamp = meta.timestamp;
        } else {
            const response = await fetch(localMeta.boundary_file, { cache: 'default' });
            data = await response.json() as Boundaries;
            updateTimestamp = localMeta.timestamp;
        }
        validateBoundaries(data);
        await db.updateBoundaryDefs(data, updateTimestamp);
        return data;
    }

    private async processTraconDefs(tracons: Tracon | undefined) {
        if (tracons) {
            return tracons;
        }
        const localMeta = await this.getLocalMeta();

        const response = await fetch(localMeta.tracon_file, { cache: 'default' });
        const data = await response.json() as Tracon;
        validateTracon(data);

        await db.updateTraconDefs(data, localMeta.timestamp);
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
        const response = await fetch('/release.json', { cache: 'default' });
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
