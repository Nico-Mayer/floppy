# Project Bibor

A minimal file sharing app for sending and receiving files, built with Wails3 and Svelte. Currently a prototype — the UI is in place, real file transfer is not implemented yet.

## Getting Started

Tasks are managed with [mise](https://mise.jdx.dev/). Run `mise install` once to get the toolchain, then:

1. To run the application in development mode (hot-reload for frontend and backend):

   ```
   mise run dev
   ```

2. To build the application for production:

   ```
   mise run build
   ```

   This creates a production-ready executable in the `bin` directory. Use `mise run package` to bundle it as a macOS `.app`, and `mise tasks` to list all available tasks.

## Exploring Wails3 Features

Now that you have your project set up, it's time to explore the features that Wails3 offers:

1. **Check out the examples**: The best way to learn is by example. Visit the `examples` directory in the `v3/examples` directory to see various sample applications.

2. **Run an example**: To run any of the examples, navigate to the example's directory and use:

   ```
   go run .
   ```

   Note: Some examples may be under development during the alpha phase.

3. **Explore the documentation**: Visit the [Wails3 documentation](https://v3.wails.io/) for in-depth guides and API references.

4. **Join the community**: Have questions or want to share your progress? Join the [Wails Discord](https://discord.gg/JDdSxwjhGf) or visit the [Wails discussions on GitHub](https://github.com/wailsapp/wails/discussions).

## Project Structure

Take a moment to familiarize yourself with your project structure:

- `frontend/`: Contains your frontend code (HTML, CSS, JavaScript/TypeScript)
- `main.go`: The entry point of your Go backend
- `app.go`: Define your application structure and methods here
- `wails.json`: Configuration file for your Wails project

## Next Steps

1. Modify the frontend in the `frontend/` directory to create your desired UI.
2. Add backend functionality in `main.go`.
3. Use `wails3 dev` to see your changes in real-time.
4. When ready, build your application with `wails3 build`.

Happy coding with Wails3! If you encounter any issues or have questions, don't hesitate to consult the documentation or reach out to the Wails community.
