# GitHub Repo to Text Converter (Local Directory Supported)

This is a fork of https://github.com/abinthomasonline/repo2txt repo, but packaged into a docker for easy execution locally

This web-based tool converts GitHub repository (or local directory) contents  into a formatted text file for Large Language Model (LLM) prompts. It streamlines the process of transforming repository data into LLM-friendly input.

![demo.gif](demo.gif)



## Features

- Display GitHub repository structure
- Select files/directories to include
- Filter files by extensions
- Generate formatted text file
- Copy text to clipboard
- Download generated text
- Support for private repositories
- Browser-based for privacy and security
- Download zip of selected files
- Local directory support

This tool runs entirely in the browser, ensuring data security without server-side processing.

## Docker Support

You can run this application in a Docker container with the following steps:

### Prerequisites

- Docker installed on your system

### Building and Running the Docker Container

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/repo2txt.git
   cd repo2txt
   ```

2. Build the Docker image:
   ```
   docker build -t repo2txt .
   ```

3. Run the container:
   ```
   docker run -d -p 8080:80 --name repo2txt-container repo2txt
   ```

4. Access the application in your browser:
   ```
   http://localhost:8080
   ```

### Stopping the Container

```
docker stop repo2txt-container
```

## To do

- Compile tailwind css (gh action maybe?)
- python bindings

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
