/**
 * main.js
 * * This file handles the primary user interactions, DOM manipulation,
 * and application state management for the SwiftMaq frontend.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        isLoggedIn: false,
        isRegistering: false,
        projects: [],
        token: null,
    };

    // --- DOM SELECTORS ---
    const authSection = document.getElementById('auth-section');
    const appContent = document.getElementById('app-content');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const usernameGroup = document.getElementById('username-group');
    const toggleToRegisterLink = document.getElementById('toggle-to-register');
    const logoutBtn = document.getElementById('logout-btn');
    const newProjectForm = document.getElementById('new-project-form');
    const projectsList = document.getElementById('projects-list');
    const projectStatusSection = document.getElementById('project-status');
    const statusUpdates = document.getElementById('status-updates');
    const finalOutput = document.getElementById('final-output');
    const repoLink = document.getElementById('repo-link');

    // --- UTILITY FUNCTIONS ---

    /**
     * Toggles between the login and main app view.
     */
    const updateView = () => {
        if (state.isLoggedIn) {
            authSection.classList.add('hidden');
            appContent.classList.remove('hidden');
            fetchAndDisplayProjects();
        } else {
            authSection.classList.remove('hidden');
            appContent.classList.add('hidden');
        }
    };

    /**
     * Toggles the auth form between login and registration modes.
     */
    const toggleAuthMode = () => {
        state.isRegistering = !state.isRegistering;
        if (state.isRegistering) {
            authTitle.textContent = 'Register';
            usernameGroup.classList.remove('hidden');
            toggleToRegisterLink.innerHTML = 'Already have an account? <a href="#" id="toggle-to-login">Login</a>';
        } else {
            authTitle.textContent = 'Login';
            usernameGroup.classList.remove('hidden'); // Assuming username for login, could be email
            toggleToRegisterLink.innerHTML = 'Don\'t have an account? <a href="#" id="toggle-to-register">Register</a>';
        }
    };

    /**
     * Renders the list of user projects in the dashboard.
     */
    const renderProjects = () => {
        projectsList.innerHTML = ''; // Clear existing projects
        if (state.projects.length === 0) {
            projectsList.innerHTML = '<p>You have no projects yet. Create one below!</p>';
            return;
        }
        state.projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <h3>${project.project_name}</h3>
                <p>${project.idea_description}</p>
                <p>Status: <span class="status">${project.status}</span></p>
            `;
            projectsList.appendChild(card);
        });
    };
    
    /**
     * Adds a status message to the project status section.
     * @param {string} message The message to display.
     */
    const addStatusUpdate = (message) => {
        const p = document.createElement('p');
        p.textContent = message;
        statusUpdates.appendChild(p);
    };


    // --- EVENT HANDLERS ---

    /**
     * Handles the submission of the login/registration form.
     * @param {Event} e The form submission event.
     */
    const handleAuthFormSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(authForm);
        const data = Object.fromEntries(formData.entries());

        try {
            let response;
            if (state.isRegistering) {
                response = await SwiftMaqAPI.register(data.username, data.password);
            } else {
                response = await SwiftMaqAPI.login(data.username, data.password);
            }

            if (response && response.token) {
                state.token = response.token;
                state.isLoggedIn = true;
                SwiftMaqAPI.setToken(state.token);
                updateView();
            } else {
                alert(response.error || 'Authentication failed.');
            }
        } catch (error) {
            alert(`An error occurred: ${error.message}`);
        }
    };

    /**
     * Fetches projects from the backend and displays them.
     */
    const fetchAndDisplayProjects = async () => {
        try {
            const projects = await SwiftMaqAPI.getProjects();
            state.projects = projects || [];
            renderProjects();
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            projectsList.innerHTML = '<p class="error">Could not load projects.</p>';
        }
    };
    
    /**
     * Handles the creation of a new project.
     * @param {Event} e The form submission event.
     */
    const handleNewProjectSubmit = async (e) => {
        e.preventDefault();
        const idea = document.getElementById('idea-description').value;
        
        // Show status section and clear previous results
        projectStatusSection.classList.remove('hidden');
        statusUpdates.innerHTML = '';
        finalOutput.classList.add('hidden');
        
        addStatusUpdate('Submitting your idea...');
        
        try {
            const result = await SwiftMaqAPI.createProject(idea);
            if (result && result.project_id) {
                pollProjectStatus(result.project_id);
            } else {
                 addStatusUpdate(`Error: ${result.error || 'Could not start project.'}`);
            }
        } catch(error) {
            addStatusUpdate(`An error occurred: ${error.message}`);
        }
    };
    
    /**
     * Periodically checks the project status until it's complete.
     * @param {number} projectId The ID of the project to poll.
     */
    const pollProjectStatus = (projectId) => {
        const interval = setInterval(async () => {
            try {
                const status = await SwiftMaqAPI.getProjectStatus(projectId);
                
                // This is a simplified mock of the agent handoff protocol.
                // In a real scenario, the backend would provide more granular status updates.
                addStatusUpdate(`Current Status: ${status.current_agent || 'Processing...'}`);

                if (status.status === 'completed') {
                    clearInterval(interval);
                    addStatusUpdate('Project generation complete!');
                    repoLink.href = status.repo_url;
                    repoLink.textContent = status.repo_url;
                    finalOutput.classList.remove('hidden');
                    fetchAndDisplayProjects(); // Refresh the project list
                } else if (status.status === 'failed') {
                    clearInterval(interval);
                    addStatusUpdate(`Error: ${status.error}`);
                }
            } catch (error) {
                clearInterval(interval);
                addStatusUpdate(`Error polling status: ${error.message}`);
            }
        }, 5000); // Poll every 5 seconds
    };
    
    /**
     * Handles user logout.
     */
    const handleLogout = () => {
        state.isLoggedIn = false;
        state.token = null;
        SwiftMaqAPI.setToken(null);
        authForm.reset();
        updateView();
    };


    // --- EVENT LISTENERS ---
    authForm.addEventListener('submit', handleAuthFormSubmit);
    logoutBtn.addEventListener('click', handleLogout);
    newProjectForm.addEventListener('submit', handleNewProjectSubmit);

    // Use event delegation for toggling auth form
    authSection.addEventListener('click', (e) => {
        if (e.target.id === 'toggle-to-register' || e.target.id === 'toggle-to-login') {
            e.preventDefault();
            toggleAuthMode();
        }
    });


    // --- INITIALIZATION ---
    updateView(); // Set the initial view based on login state
});
