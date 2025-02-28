import { displayDirectoryStructure, getSelectedFiles, formatRepoContents } from './utils.js';

// Load saved token on page load
document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();
    setupShowMoreInfoButton();
    loadSavedToken();
});

// Load saved token from local storage
function loadSavedToken() {
    const savedToken = localStorage.getItem('githubAccessToken');
    if (savedToken) {
        document.getElementById('accessToken').value = savedToken;
    }
}

// Save token to local storage
function saveToken(token) {
    if (token) {
        localStorage.setItem('githubAccessToken', token);
    } else {
        localStorage.removeItem('githubAccessToken');
    }
}

// Parse GitHub or GitLab repository URL
function parseRepoUrl(url) {
    url = url.replace(/\/$/, '');
    
    // GitHub URL pattern
    const githubPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/tree\/(.+))?$/;
    const githubMatch = url.match(githubPattern);
    
    if (githubMatch) {
        return {
            type: 'github',
            owner: githubMatch[1],
            repo: githubMatch[2],
            lastString: githubMatch[4] || '',
        };
    }
    
    // GitLab URL pattern - handles both gitlab.com and custom GitLab instances
    const gitlabPattern = /^https:\/\/([^\/]+)\/([^\/]+)\/([^\/]+)(\/\-\/tree\/(.+))?$/;
    const gitlabMatch = url.match(gitlabPattern);
    
    if (gitlabMatch) {
        return {
            type: 'gitlab',
            instance: gitlabMatch[1],
            owner: gitlabMatch[2],
            repo: gitlabMatch[3],
            lastString: gitlabMatch[5] || '',
        };
    }
    
    throw new Error('Invalid repository URL. Please ensure the URL is in one of these formats: ' +
        'https://github.com/owner/repo, https://github.com/owner/repo/tree/branch/path, ' +
        'https://gitlab.example.com/owner/repo, or https://gitlab.example.com/owner/repo/-/tree/branch/path');
}

// Event listener for form submission
document.getElementById('repoForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const repoUrl = document.getElementById('repoUrl').value;
    const accessToken = document.getElementById('accessToken').value;

    // Save token automatically
    saveToken(accessToken);

    const outputText = document.getElementById('outputText');
    outputText.value = '';

    try {
        // Parse repository URL and fetch repository contents
        const repoInfo = parseRepoUrl(repoUrl);
        let refFromUrl = '';
        let pathFromUrl = '';

        if (repoInfo.lastString) {
            if (repoInfo.type === 'github') {
                const references = await getReferences(repoInfo.owner, repoInfo.repo, accessToken, 'github');
                const allRefs = [...references.branches, ...references.tags];
                
                const matchingRef = allRefs.find(ref => repoInfo.lastString.startsWith(ref));
                if (matchingRef) {
                    refFromUrl = matchingRef;
                    pathFromUrl = repoInfo.lastString.slice(matchingRef.length + 1);
                } else {
                    refFromUrl = repoInfo.lastString;
                }
            } else if (repoInfo.type === 'gitlab') {
                const references = await getReferences(repoInfo.owner, repoInfo.repo, accessToken, 'gitlab', repoInfo.instance);
                const allRefs = [...references.branches, ...references.tags];
                
                const matchingRef = allRefs.find(ref => repoInfo.lastString.startsWith(ref));
                if (matchingRef) {
                    refFromUrl = matchingRef;
                    pathFromUrl = repoInfo.lastString.slice(matchingRef.length + 1);
                } else {
                    refFromUrl = repoInfo.lastString;
                }
            }
        }

        let tree;
        if (repoInfo.type === 'github') {
            const sha = await fetchRepoSha(repoInfo.owner, repoInfo.repo, refFromUrl, pathFromUrl, accessToken, 'github');
            tree = await fetchRepoTree(repoInfo.owner, repoInfo.repo, sha, accessToken, 'github');
        } else if (repoInfo.type === 'gitlab') {
            tree = await fetchGitLabTree(repoInfo.instance, repoInfo.owner, repoInfo.repo, refFromUrl, pathFromUrl, accessToken);
        }

        displayDirectoryStructure(tree);
        document.getElementById('generateTextButton').style.display = 'flex';
        document.getElementById('downloadZipButton').style.display = 'flex';
    } catch (error) {
        outputText.value = `Error fetching repository contents: ${error.message}\n\n` +
            "Please ensure:\n" +
            "1. The repository URL is correct and accessible.\n" +
            "2. You have the necessary permissions to access the repository.\n" +
            "3. If it's a private repository, you've provided a valid access token.\n" +
            "4. The specified branch/tag and path (if any) exist in the repository.";
    }
});

// Event listener for generating text file
document.getElementById('generateTextButton').addEventListener('click', async function () {
    const accessToken = document.getElementById('accessToken').value;
    const outputText = document.getElementById('outputText');
    outputText.value = '';

    // Save token automatically
    saveToken(accessToken);

    try {
        const selectedFiles = getSelectedFiles();
        if (selectedFiles.length === 0) {
            throw new Error('No files selected');
        }
        const fileContents = await fetchFileContents(selectedFiles, accessToken);
        const formattedText = formatRepoContents(fileContents);
        outputText.value = formattedText;

        document.getElementById('copyButton').style.display = 'flex';
        document.getElementById('downloadButton').style.display = 'flex';
    } catch (error) {
        outputText.value = `Error generating text file: ${error.message}\n\n` +
            "Please ensure:\n" +
            "1. You have selected at least one file from the directory structure.\n" +
            "2. Your access token (if provided) is valid and has the necessary permissions.\n" +
            "3. You have a stable internet connection.\n" +
            "4. The GitHub API is accessible and functioning normally.";
    }
});

// Event listener for downloading zip file
document.getElementById('downloadZipButton').addEventListener('click', async function () {
    const accessToken = document.getElementById('accessToken').value;

    try {
        const selectedFiles = getSelectedFiles();
        if (selectedFiles.length === 0) {
            throw new Error('No files selected');
        }
        const fileContents = await fetchFileContents(selectedFiles, accessToken);
        await createAndDownloadZip(fileContents);
    } catch (error) {
        const outputText = document.getElementById('outputText');
        outputText.value = `Error generating zip file: ${error.message}\n\n` +
            "Please ensure:\n" +
            "1. You have selected at least one file from the directory structure.\n" +
            "2. Your access token (if provided) is valid and has the necessary permissions.\n" +
            "3. You have a stable internet connection.\n" +
            "4. The GitHub API is accessible and functioning normally.";
    }
});

// Event listener for copying text to clipboard
document.getElementById('copyButton').addEventListener('click', function () {
    const outputText = document.getElementById('outputText');
    outputText.select();
    navigator.clipboard.writeText(outputText.value)
        .then(() => console.log('Text copied to clipboard'))
        .catch(err => console.error('Failed to copy text: ', err));
});

// Event listener for downloading text file
document.getElementById('downloadButton').addEventListener('click', function () {
    const outputText = document.getElementById('outputText').value;
    if (!outputText.trim()) {
        document.getElementById('outputText').value = 'Error: No content to download. Please generate the text file first.';
        return;
    }
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt.txt';
    a.click();
    URL.revokeObjectURL(url);
});

// Fetch repository references
async function getReferences(owner, repo, token, type, instance = 'github.com') {
    if (type === 'github') {
        const headers = {
            'Accept': 'application/vnd.github+json'
        };
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }

        const [branchesResponse, tagsResponse] = await Promise.all([
            fetch(`https://api.github.com/repos/${owner}/${repo}/git/matching-refs/heads/`, { headers }),
            fetch(`https://api.github.com/repos/${owner}/${repo}/git/matching-refs/tags/`, { headers })
        ]);

        if (!branchesResponse.ok || !tagsResponse.ok) {
            throw new Error('Failed to fetch references');
        }

        const branches = await branchesResponse.json();
        const tags = await tagsResponse.json();

        return {
            branches: branches.map(b => b.ref.split("/").slice(2).join("/")),
            tags: tags.map(t => t.ref.split("/").slice(2).join("/"))
        };
    } else if (type === 'gitlab') {
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const encodedProject = encodeURIComponent(`${owner}/${repo}`);
        const baseUrl = `https://${instance}/api/v4/projects/${encodedProject}`;
        
        const [branchesResponse, tagsResponse] = await Promise.all([
            fetch(`${baseUrl}/repository/branches`, { headers }),
            fetch(`${baseUrl}/repository/tags`, { headers })
        ]);

        if (!branchesResponse.ok || !tagsResponse.ok) {
            throw new Error('Failed to fetch references');
        }

        const branches = await branchesResponse.json();
        const tags = await tagsResponse.json();

        return {
            branches: branches.map(b => b.name),
            tags: tags.map(t => t.name)
        };
    }
}

// Fetch repository SHA
async function fetchRepoSha(owner, repo, ref, path, token, type, instance = 'github.com') {
    if (type === 'github') {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path ? `${path}` : ''}${ref ? `?ref=${ref}` : ''}`;
        const headers = {
            'Accept': 'application/vnd.github.object+json'
        };
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }
        const response = await fetch(url, { headers });
        if (!response.ok) {
            handleFetchError(response);
        }
        const data = await response.json();
        return data.sha;
    }
    // GitLab doesn't use SHA in the same way, so this function is only needed for GitHub
}

// Fetch GitLab repository tree
async function fetchGitLabTree(instance, owner, repo, ref, path, token) {
    const encodedProject = encodeURIComponent(`${owner}/${repo}`);
    const encodedPath = path ? encodeURIComponent(path) : '';
    
    let url = `https://${instance}/api/v4/projects/${encodedProject}/repository/tree`;
    const params = new URLSearchParams();
    
    if (ref) {
        params.append('ref', ref);
    }
    
    if (path) {
        params.append('path', path);
    }
    
    params.append('recursive', 'true');
    
    url = `${url}?${params.toString()}`;
    
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
        handleFetchError(response);
    }
    
    const data = await response.json();
    
    // Transform the GitLab format to match the GitHub format used by the rest of the app
    return data.map(item => {
        let type;
        if (item.type === 'tree') {
            type = 'tree';
        } else if (item.type === 'blob') {
            type = 'blob';
        } else {
            type = item.type;
        }
        
        const itemPath = path ? `${path}/${item.path}` : item.path;
        
        return {
            path: itemPath,
            type: type,
            url: `https://${instance}/api/v4/projects/${encodedProject}/repository/files/${encodeURIComponent(itemPath)}/raw${ref ? `?ref=${ref}` : ''}`
        };
    });
}

// Fetch repository tree
async function fetchRepoTree(owner, repo, sha, token, type, instance = 'github.com') {
    if (type === 'github') {
        const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`;
        const headers = {
            'Accept': 'application/vnd.github+json'
        };
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }
        const response = await fetch(url, { headers });
        if (!response.ok) {
            handleFetchError(response);
        }
        const data = await response.json();
        return data.tree;
    }
    // This function is only needed for GitHub since fetchGitLabTree is separate
}

// Handle fetch errors
function handleFetchError(response) {
    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
        throw new Error('API rate limit exceeded. Please try again later or provide a valid access token to increase your rate limit.');
    }
    if (response.status === 404) {
        throw new Error(`Repository, branch, or path not found. Please check that the URL, branch/tag, and path are correct and accessible.`);
    }
    throw new Error(`Failed to fetch repository data. Status: ${response.status}. Please check your input and try again.`);
}

// Fetch contents of selected files
async function fetchFileContents(files, token) {
    let contents = [];
    
    for (const file of files) {
        // Determine if this is a GitHub or GitLab URL
        const isGitLab = file.url.includes('/api/v4/projects/');
        
        const headers = {};
        if (token) {
            if (isGitLab) {
                headers['Authorization'] = `Bearer ${token}`;
            } else {
                headers['Authorization'] = `token ${token}`;
                headers['Accept'] = 'application/vnd.github.v3.raw';
            }
        } else if (!isGitLab) {
            headers['Accept'] = 'application/vnd.github.v3.raw';
        }
        
        const response = await fetch(file.url, { headers });
        if (!response.ok) {
            handleFetchError(response);
        }
        
        const text = await response.text();
        contents.push({ url: file.url, path: file.path, text });
    }
    
    return contents;
}

function setupShowMoreInfoButton() {
    const showMoreInfoButton = document.getElementById('showMoreInfo');
    const tokenInfo = document.getElementById('tokenInfo');

    showMoreInfoButton.addEventListener('click', function() {
        tokenInfo.classList.toggle('hidden');
        updateInfoIcon(this, tokenInfo);
    });
}

function updateInfoIcon(button, tokenInfo) {
    const icon = button.querySelector('[data-lucide]');
    if (icon) {
        icon.setAttribute('data-lucide', tokenInfo.classList.contains('hidden') ? 'info' : 'x');
        lucide.createIcons();
    }
}

// Create and download zip file
async function createAndDownloadZip(fileContents) {
    const zip = new JSZip();

    fileContents.forEach(file => {
        // Remove leading slash if present
        const filePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
        zip.file(filePath, file.text);
    });

    const content = await zip.generateAsync({type: "blob"});
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'partial_repo.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
