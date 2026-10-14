# API Documentation

## Base URL

- Development: `http://localhost:8765`
- Production: Served via the API container

## Available Routes

All routes are mounted on the base URL above. The API returns JSON responses.

### 1. Health

**Base:** `/health`

#### GET `/health`
Returns the health status of the API server.

**Response:**
```json
{
  "ok": true,
  "message": "express server is healthy at MM/DD/YY HH:MM:SS"
}
```


---

### 2. Overview

**Base:** `/overview`

The Overview endpoints provide high-level statistics about repositories. All overview endpoints support query parameters for filtering by `university`, `language`, `license`, and `typePredictionGpt5Mini` (using exact case-insensitive matching).

#### GET `/overview`
Returns all overview metrics for filtered repositories.

**Query Parameters:**
- `university` (optional) - Filter by university (exact match, case-insensitive)
- `language` (optional) - Filter by programming language (exact match, case-insensitive)
- `license` (optional) - Filter by license (exact match, case-insensitive)
- `typePredictionGpt5Mini` (optional) - Filter by predicted type (exact match, case-insensitive)

**Response Type:** `RespOverview`

**Fields:**
- `totalRepos` (number) - Total number of repositories
- `withLicense` (number) - Number of repositories with a license
- `percentWithLicense` (number) - Percentage of repositories with a license
- `totalContributors` (number) - Total contributors across all repositories (sum of `contributorCount`)
- `avgBusFactor` (number) - Average bus factor across all repositories
- `reposPerUniversity` (Array<{name: string, value: number}>) - Count of repositories grouped by university
- `languageDistribution` (Array<{name: string, value: number}>) - Distribution of languages as proportions (0-1)
- `licenseDistribution` (Array<{name: string, value: number}>) - Distribution of licenses as proportions (0-1)
- `typeDistribution` (Array<{name: string, value: number}>) - Distribution of predicted types as proportions (0-1)
- `communityFilesPresence` (Array<{name: string, value: number}>) - Percentage presence of each community file (0-100)
  - Fields checked: `issueTemplates`, `securityPolicy`, `codeOfConductFile`, `pullRequestTemplate`, `contributing`, `license`, `description`, `readme`
- `languageDistributionByType` (Array<{name: string, [type: string]: string | number}>) - Language distribution broken down by repository type
- `licenseDistributionByType` (Array<{name: string, [type: string]: string | number}>) - License distribution broken down by repository type

#### GET `/overview/:endpoint`
Returns data for a specific sub-endpoint. Same query parameter filtering applies.

**Available sub-endpoints:**
- `/overview/totalRepos` -> `{ totalRepos: number }`
- `/overview/withLicense` -> `{ withLicense: number }`
- `/overview/percentWithLicense` -> `{ percentWithLicense: number }`
- `/overview/totalContributors` -> `{ totalContributors: number }`
- `/overview/avgBusFactor` -> `{ avgBusFactor: number }`
- `/overview/reposPerUniversity` -> `{ reposPerUniversity: Array<{name, value}> }`
- `/overview/languageDistribution` -> `{ languageDistribution: Array<{name, value}> }`
- `/overview/licenseDistribution` -> `{ licenseDistribution: Array<{name, value}> }`
- `/overview/typeDistribution` -> `{ typeDistribution: Array<{name, value}> }`
- `/overview/communityFilesPresence` -> `{ communityFilesPresence: Array<{name, value}> }`
- `/overview/languageDistributionByType` -> `{ languageDistributionByType: Array<{name, [key: string]: string|number}> }`
- `/overview/licenseDistributionByType` -> `{ licenseDistributionByType: Array<{name, [key: string]: string|number}> }`


---

### 3. Impact

**Base:** `/impact`

The Impact endpoints provide metrics related to repository popularity and reach. All endpoints support query parameters for filtering by `university`, `language`, `license`, and `typePredictionGpt5Mini` (exact case-insensitive matching).

#### GET `/impact`
Returns all impact metrics for filtered repositories.

**Query Parameters:**
- `university` (optional) - Filter by university (exact match, case-insensitive)
- `language` (optional) - Filter by programming language (exact match, case-insensitive)
- `license` (optional) - Filter by license (exact match, case-insensitive)
- `typePredictionGpt5Mini` (optional) - Filter by predicted type (exact match, case-insensitive)

**Response Type:** `RespImpact`

**Fields:**
- `totalStars` (number) - Total stars across all repositories (sum of `stargazersCount`)
- `totalForks` (number) - Total forks across all repositories (sum of `forksCount`)
- `totalDownloads` (number) - Total release downloads across all repositories (sum of `releaseDownloads`)
- `totalContributors` (number) - Total contributors across all repositories (sum of `contributorCount`)
- `impactIndicatorsPerUniversity` (Array<{name: string, [key: string]: string | number}>) - Impact indicators aggregated per university
- `starsDistribution` (Array<{name: string, value: number}>) - Distribution of stars
- `forksDistribution` (Array<{name: string, value: number}>) - Distribution of forks
- `releaseDownloadsDistribution` (Array<{name: string, value: number}>) - Distribution of release downloads
- `contributorsDistribution` (Array<{name: string, value: number}>) - Distribution of contributors

#### GET `/impact/:endpoint`
Returns data for a specific sub-endpoint. Same query parameter filtering applies.

**Available sub-endpoints:**
- `/impact/totalStars` -> `{ totalStars: number }`
- `/impact/totalForks` -> `{ totalForks: number }`
- `/impact/totalDownloads` -> `{ totalDownloads: number }`
- `/impact/totalContributors` -> `{ totalContributors: number }`
- `/impact/impactIndicatorsPerUniversity` -> `{ impactIndicatorsPerUniversity: Array<{name, [key: string]: string|number}> }`
- `/impact/starsDistribution` -> `{ starsDistribution: Array<{name, value}> }`
- `/impact/forksDistribution` -> `{ forksDistribution: Array<{name, value}> }`
- `/impact/releaseDownloadsDistribution` -> `{ releaseDownloadsDistribution: Array<{name, value}> }`
- `/impact/contributorsDistribution` -> `{ contributorsDistribution: Array<{name, value}> }`


---

### 4. Sustainability

**Base:** `/sustainability`

The Sustainability endpoints provide metrics related to long-term project health and sustainability. All endpoints support query parameters for filtering by `university`, `language`, `license`, and `typePredictionGpt5Mini` (exact case-insensitive matching).

#### GET `/sustainability`
Returns all sustainability metrics for filtered repositories.

**Query Parameters:**
- `university` (optional) - Filter by university (exact match, case-insensitive)
- `language` (optional) - Filter by programming language (exact match, case-insensitive)
- `license` (optional) - Filter by license (exact match, case-insensitive)
- `typePredictionGpt5Mini` (optional) - Filter by predicted type (exact match, case-insensitive)

**Response Type:** `respSustainability`

**Fields:**
- `avgContributors` (number) - Average number of contributors (finite numeric values only)
- `avgBusFactor` (number) - Average bus factor (finite numeric values only)
- `sustainabilityIndicatorsPerUniversity` (Array<{name: string, avgContributors: number, avgBusFactor: number}>) - Sustainability indicators aggregated per university
- `communityFiles` (Array<{name: string, total: number, percentage: number, [projectType: string]: string | number}>) - Community files presence broken down by project type
- `communityFilesByStars` (Array<{name: string, '0-10': number, '11-50': number, '51-100': number, '101-200': number, '>200': number}>) - Community files presence broken down by star ranges
- `busFactorDistribution` (Array<{name: string, value: number, percentage: number}>) - Distribution of bus factor values with percentages
- `contributorCountDistribution` (Array<{name: string, value: number, percentage: number}>) - Distribution of contributor counts with percentages

#### GET `/sustainability/:endpoint`
Returns data for a specific sub-endpoint. Same query parameter filtering applies.

**Available sub-endpoints:**
- `/sustainability/avgContributors` -> `{ avgContributors: number }`
- `/sustainability/avgBusFactor` -> `{ avgBusFactor: number }`
- `/sustainability/sustainabilityIndicatorsPerUniversity` -> `{ sustainabilityIndicatorsPerUniversity: Array<{name, avgContributors, avgBusFactor}> }`
- `/sustainability/communityFiles` -> `{ communityFiles: Array<{name, total, percentage, [projectType: string]: string|number}> }`
- `/sustainability/communityFilesByStars` -> `{ communityFilesByStars: Array<{name, '0-10', '11-50', '51-100', '101-200', '>200'}> }`
- `/sustainability/busFactorDistribution` -> `{ busFactorDistribution: Array<{name, value, percentage}> }`
- `/sustainability/contributorCountDistribution` -> `{ contributorCountDistribution: Array<{name, value, percentage}> }`


---

### 5. Security

**Base:** `/security`

The Security endpoints provide OpenSSF Scorecard metrics for repositories. Security data comes from a separate dataset (`secrData`). All endpoints support query parameters for filtering by `license` (exact case-insensitive matching).

#### GET `/security`
Returns all security metrics for filtered repositories.

**Query Parameters:**
- `license` (optional) - Filter by license (exact match, case-insensitive)

**Response Type:** `RespSecurity`

**Fields:**
- `securityScorecardByRepo` (Array<secrData>) - Full security scorecard data for each repository (includes htmlUrl and all OpenSSF Scorecard metrics)
- `avgScorePerMetric` (Array<{name: string, value: number}>) - Average score per security metric

#### GET `/security/:endpoint`
Returns data for a specific sub-endpoint. Same query parameter filtering applies.

**Available sub-endpoints:**
- `/security/securityScorecardByRepo` -> `{ securityScorecardByRepo: Array<secrData> }`
- `/security/avgScorePerMetric` -> `{ avgScorePerMetric: Array<{name, value}> }`


---

### 6. Organization

**Base:** `/organization`

The Organization endpoints provide statistics about GitHub organizations. Organization data comes from a separate dataset (`orgsData`). All endpoints support query parameters for filtering by `university` (exact case-insensitive matching).

#### GET `/organization`
Returns all organization metrics for filtered organizations.

**Query Parameters:**
- `university` (optional) - Filter by university (exact match, case-insensitive)

**Response Type:** `RespOrganization`

**Fields:**
- `totalOrganizations` (number) - Total number of organizations
- `percentOrganizationsURL` (number) - Percentage of organizations with a URL
- `percentOrganizationsDescription` (number) - Percentage of organizations with a description
- `percentOrganizationsEmail` (number) - Percentage of organizations with an email
- `orgsPerUniversity` (Array<{name: string, value: number}>) - Count of organizations grouped by university
- `orgsCreatedPerYear` (Array<{name: string, value: number}>) - Organizations created per year
- `profileCompleteness` (Array<{name: string, value: number}>) - Distribution of profile completeness

#### GET `/organization/:endpoint`
Returns data for a specific sub-endpoint. Same query parameter filtering applies.

**Available sub-endpoints:**
- `/organization/totalOrganizations` -> `{ totalOrganizations: number }`
- `/organization/percentOrganizationsURL` -> `{ percentOrganizationsURL: number }`
- `/organization/percentOrganizationsDescription` -> `{ percentOrganizationsDescription: number }`
- `/organization/percentOrganizationsEmail` -> `{ percentOrganizationsEmail: number }`
- `/organization/orgsPerUniversity` -> `{ orgsPerUniversity: Array<{name, value}> }`
- `/organization/orgsCreatedPerYear` -> `{ orgsCreatedPerYear: Array<{name, value}> }`
- `/organization/profileCompleteness` -> `{ profileCompleteness: Array<{name, value}> }`


---

## Filtering

All repository-based endpoints (`/overview`, `/impact`, `/sustainability`) support filtering by:
- `university` - Exact match, case-insensitive
- `language` - Exact match, case-insensitive  
- `license` - Exact match, case-insensitive
- `typePredictionGpt5Mini` - Exact match, case-insensitive

Security endpoints (`/security`) support filtering by:
- `license` - Exact match, case-insensitive

Organization endpoints (`/organization`) support filtering by:
- `university` - Exact match, case-insensitive

Multiple query parameters can be combined. If multiple values are provided for the same parameter (e.g., `?language=JavaScript&language=Python`), the filter returns rows matching any of the values.

---

## Notes

- Distributions in overview/impact routes are typically returned as proportions (0-1), while counts are returned as absolute numbers.
- Some array fields include keys derived from data values (e.g., university names, language names).
- The API currently serves sample data from JSON files in `api/data/sample/` for development.
    - 
- All data is loaded from Parquet files in production (see README for details).
