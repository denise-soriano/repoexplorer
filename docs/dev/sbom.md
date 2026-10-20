# SBOMs (Software Bill of Materials)
The [sbom workflow](../../.github/workflows/sbom.yml) runs on every push and pull request to `main`. It uses [Syft](https://github.com/anchore/syft) to generate an SPDX JSON SBOM for the backend and the frontend from their `package-lock.json` files:
- *repoexplorer-api-sbom.spdx.json*: the packages in */api/package-lock.json*
- *repoexplorer-app-sbom.spdx.json*: the packages in */app/package-lock.json*

The SBOMs include development dependencies. Both builds bundle some of them into the shipped code: Vite bundles `recharts` into the frontend, and tsup bundles `cors` into the backend.

## Download an SBOM
- Open a run of the [sbom workflow](https://github.com/oss-slu/repoexplorer/actions/workflows/sbom.yml)
- Download `repoexplorer-api-sbom` or `repoexplorer-app-sbom` from the **Artifacts** section of the run summary, then unzip it
- Or download one with the [GitHub CLI](https://cli.github.com/). This puts the `.spdx.json` file in the current directory:
    ```
    gh run download <run-id> -R oss-slu/repoexplorer -n repoexplorer-api-sbom
    ```

## Verify an SBOM
On pushes to `main`, the workflow also creates a signed attestation for each SBOM. It records the repository, commit, and workflow that produced the file. To check that a downloaded SBOM came from this repository's workflow and hasn't been changed:
```
gh attestation verify ./repoexplorer-api-sbom.spdx.json --owner oss-slu
gh attestation verify ./repoexplorer-app-sbom.spdx.json --owner oss-slu
```
SBOMs from pull request runs are not attested.
