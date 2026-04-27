
  # News Media Website Design

  This is a code bundle for News Media Website Design. The original project is available at https://www.figma.com/design/yJx3QG0IZRozQOL2IkbRRz/News-Media-Website-Design.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Backend integration

  The app reads categories and generated stories from the Mediababa backend.

  - Default API base URL: `http://localhost:4000/api`
  - Override with: `VITE_API_BASE_URL`

  If backend is not available, the app falls back to local sample stories.
  