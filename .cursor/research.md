# GitHub Repository Expertise & Project Mapping System

## Overview

This project analyzes GitHub repositories to identify contributor expertise, project structure, and collaboration patterns. Rather than performing expensive commit-by-commit LLM analysis, the system derives insights from repository metadata, code structure, pull requests, issues, and commit history.

The resulting data is transformed into a knowledge graph that powers an interactive visualization of repository subprojects, contributor skills, and team relationships.

---

# Goals

## Repository Understanding

* Identify logical project boundaries within a repository.
* Detect technologies, languages, frameworks, and tooling used throughout the codebase.
* Understand ownership and contributor activity across repository components.

## Contributor Understanding

* Infer skills demonstrated through code contributions.
* Identify areas of expertise and ownership.
* Track participation across projects and technologies.

## Collaboration Understanding

* Detect relationships between contributors.
* Analyze collaboration patterns through issues, pull requests, reviews, and discussions.
* Identify frequently collaborating individuals and teams.

---

# Workflow

## 1. GitHub Data Collection

Collect repository activity from GitHub APIs. First, the files in the repository.

### Pull Requests

For each pull request:

* Pull request metadata
* Author information
* Review information
* Associated commits
* Changed files
* Related issues

### Issues

Collect:

* Issue metadata
* Authors
* Assignees
* Labels
* Comments
* Cross-references to pull requests

### Commits

For each commit:

* Author
* Timestamp
* Commit message
* Files modified

### Output

Generate a normalized repository activity dataset that links:

* Pull requests
* Issues
* Commits
* Contributors

---

## 2. Repository Parsing

Analyze repository structure and contribution activity from data collected.

### File Analysis

Extract:

* Files modified
* Directory paths
* Module ownership

### Language Detection

Identify:

* Programming languages
* Configuration languages
* Infrastructure definitions

### Framework Detection

Identify technologies through:

* Dependency manifests
* Imports
* Build configurations
* Framework-specific files

### Output

Generate a repository technology graph containing:

* Modules
* Languages
* Frameworks
* Contributor touchpoints

---

## 3. Knowledge Graph Computation

Transform repository activity into higher-level organizational knowledge.

### Skill Inference

Infer skills for each contributor from:

* Commit messages
* Files modified
* Languages used
* Frameworks used
* Project areas contributed to

Skills should be represented as structured entities rather than free-form text.

### Project Boundary Detection

Identify repository subprojects using:

* Directory structure
* Dependency relationships
* Shared contributor activity
* Architectural clustering

The system should generate logical project groupings that represent functional areas of the repository.

### Relationship Detection

Infer contributor relationships using:

* Pull request reviews
* Issue discussions
* Co-authored work
* Shared project ownership
* Repeated collaboration patterns

### Output

Generate a knowledge graph containing:

#### Contributors

* Skills
* Technologies
* Project ownership
* Collaboration links

#### Projects

* Subprojects
* Technologies
* Contributors
* Dependency relationships

#### Technologies

* Languages
* Frameworks
* Tools
* Infrastructure components

---

## 4. Front-End Visualization

Provide an interactive graph interface for repository exploration.

### Views

#### Contributor View

Display:

* Contributor skills
* Technologies
* Owned project areas
* Collaboration relationships

#### Project View

Display:

* Repository subprojects
* Contributors
* Technology stacks
* Dependency relationships

#### Technology View

Display:

* Languages
* Frameworks
* Tooling
* Associated contributors and projects

### Graph Capabilities

Support:

* Node exploration
* Relationship traversal
* Filtering
* Search
* Skill discovery
* Ownership discovery

---

# System Architecture

## Data Layer

Stores:

* GitHub activity data
* Repository metadata
* Computed graph entities

## Analysis Layer

Responsible for:

* Repository parsing
* Technology detection
* Skill inference
* Relationship computation
* Project boundary detection

## Knowledge Graph Layer

Maintains:

* Contributors
* Skills
* Projects
* Technologies
* Relationships

## Visualization Layer

Provides:

* Interactive graph rendering
* Search and filtering
* Contributor exploration
* Project exploration
* Technology exploration

---

# Expected Outputs

The system should produce:

1. Repository subproject mappings.
2. Contributor skill profiles.
3. Technology usage mappings.
4. Contributor relationship networks.
5. Project ownership insights.
6. Interactive graph-based repository exploration.
