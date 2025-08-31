# 🤝 Contributing to YT-OCR Backend

Thank you for your interest in contributing to the YT-OCR Backend project! We welcome contributions from developers, designers, and OCR enthusiasts.

## 🎨 Project Architecture Overview

```mermaid
flowchart TD
    subgraph "Development Environment"
        A[Local Development]
        B[Testing Environment]
        C[Production Build]
    end
    
    subgraph "Core Components"
        D[Spring Boot API]
        E[Chrome Extension]
        F[Web Interface]
        G[OCR Engine]
    end
    
    subgraph "External Dependencies"
        H[Tesseract OCR]
        I[Chrome APIs]
        J[Maven Dependencies]
    end
    
    A --> D
    A --> E
    A --> F
    D --> G
    G --> H
    E --> I
    D --> J
```

## 🤝 How to Contribute

### Reporting Issues
- Use the GitHub issue tracker to report bugs
- Include detailed steps to reproduce the issue
- Provide system information (OS, Java version, browser)
- Include error logs and screenshots if applicable

### Suggesting Features
- Open an issue with the "enhancement" label
- Describe the feature and its use case
- Explain why it would be valuable to users

### Code Contributions

#### Prerequisites
- Java 17 or higher
- Maven 3.6+
- Git
- Chrome/Edge browser for testing

#### 🔧 Development Setup

```mermaid
flowchart LR
    A[Fork Repository] --> B[Clone Locally]
    B --> C[Install Dependencies]
    C --> D[Setup Tesseract]
    D --> E[Run Backend]
    E --> F[Load Extension]
    F --> G[Start Development]
```

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/yt-ocr-backend.git
   cd yt-ocr-backend
   ```

2. **Environment Setup**
   ```bash
   # Install Java 17 (if not installed)
   # Windows: choco install openjdk17
   # macOS: brew install openjdk@17
   # Linux: sudo apt install openjdk-17-jdk
   
   # Install Tesseract OCR
   # Windows: choco install tesseract
   # macOS: brew install tesseract
   # Linux: sudo apt install tesseract-ocr
   ```

3. **Project Dependencies**
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

4. **Chrome Extension Setup**
   - Open Chrome: `chrome://extensions/`
   - Enable "Developer mode"
   - Load unpacked: `src/main/resources/chrome-extension`

5. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Making Changes
1. Make your changes in the appropriate files
2. Follow the existing code style and conventions
3. Add tests for new functionality
4. Update documentation if needed
5. Test your changes thoroughly

#### 🧪 Testing Workflow

```mermaid
flowchart LR
    subgraph "Backend Testing"
        A[Unit Tests]
        B[Integration Tests]
        C[API Tests]
    end
    
    subgraph "Frontend Testing"
        D[Web Interface]
        E[Extension Testing]
        F[Cross-browser]
    end
    
    subgraph "OCR Testing"
        G[Accuracy Tests]
        H[Performance Tests]
        I[Edge Cases]
    end
    
    A --> D
    B --> E
    C --> F
    D --> G
    E --> H
    F --> I
```

**Backend Testing**
```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=OcrServiceTest

# Run with coverage
mvn test jacoco:report
```

**Frontend Testing**
- Web Interface: `http://localhost:8080`
- Extension: Load in Chrome developer mode
- Cross-browser: Test in Chrome, Edge, Firefox

**OCR Testing**
- Test with various image formats (PNG, JPG, GIF)
- Verify text extraction accuracy
- Test with different text layouts
- Performance benchmarking

**Test Cases to Cover**
- [ ] File upload functionality
- [ ] Base64 image processing
- [ ] Extension screen capture
- [ ] Text extraction accuracy
- [ ] Error handling scenarios
- [ ] Performance under load
- [ ] Cross-site compatibility

#### Submitting Changes
1. Commit your changes:
   ```bash
   git add .
   git commit -m "Add: brief description of changes"
   ```
2. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
3. Create a Pull Request with:
   - Clear title and description
   - Reference any related issues
   - Screenshots/demos if applicable

## 📝 Code Style Guidelines

### Java Code
- Follow standard Java naming conventions
- Use meaningful variable and method names
- Add JavaDoc comments for public methods
- Keep methods focused and concise
- Handle exceptions appropriately

### JavaScript Code
- Use camelCase for variables and functions
- Add comments for complex logic
- Follow async/await patterns
- Handle errors gracefully
- Use const/let instead of var

### CSS
- Use meaningful class names
- Follow BEM methodology where applicable
- Keep styles organized and commented
- Use CSS custom properties for theming

## 🐛 Bug Reports

When reporting bugs, please include:
- **Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed steps to reproduce the bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, Java version, browser version
- **Screenshots**: If applicable
- **Error Logs**: Console errors or stack traces

## 💡 Feature Requests

For feature requests, please provide:
- **Use Case**: Why is this feature needed?
- **Description**: Detailed description of the feature
- **Mockups**: UI mockups if applicable
- **Implementation Ideas**: Any thoughts on implementation

## 📋 Pull Request Checklist

Before submitting a PR, ensure:
- [ ] Code follows project style guidelines
- [ ] Tests pass (`mvn test`)
- [ ] New features include tests
- [ ] Documentation is updated
- [ ] Chrome extension works correctly
- [ ] Web interface functions properly
- [ ] No console errors or warnings
- [ ] Commit messages are clear and descriptive

## 🔍 Code Review Process

```mermaid
flowchart TD
    A[Submit PR] --> B{Automated Checks}
    B -->|Pass| C[Manual Review]
    B -->|Fail| D[Fix Issues]
    D --> A
    C --> E{Code Quality}
    E -->|Approved| F[Merge to Main]
    E -->|Changes Needed| G[Request Changes]
    G --> H[Update PR]
    H --> C
    F --> I[Deploy to Production]
```

### Review Criteria
1. **Automated Checks**: All tests must pass
   - Unit tests (`mvn test`)
   - Integration tests
   - Code style validation
   - Security scans

2. **Manual Review**: Code quality assessment
   - Architecture compliance
   - Performance considerations
   - Security best practices
   - Documentation completeness

3. **Testing Requirements**: Comprehensive validation
   - Backend API functionality
   - Chrome extension compatibility
   - Cross-browser testing
   - OCR accuracy verification

4. **Feedback Process**: Collaborative improvement
   - Constructive feedback with examples
   - Suggested improvements
   - Performance optimization tips
   - Best practice recommendations

## 📚 Development Resources

### Useful Links
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [Tess4J Documentation](https://github.com/nguyenq/tess4j)

### Project Structure
```
src/main/java/com/ocr/yt_ocr_backend/
├── controller/     # REST API endpoints
├── service/        # Business logic
├── dto/           # Data transfer objects
└── util/          # Utility classes

src/main/resources/
├── static/        # Web interface assets
├── templates/     # HTML templates
└── chrome-extension/  # Extension files
```

## 🎯 Areas for Contribution

We especially welcome contributions in these areas:
- **Performance Optimization**: Improve OCR processing speed
- **Language Support**: Add support for more languages
- **UI/UX Improvements**: Enhance user interface and experience
- **Error Handling**: Better error messages and recovery
- **Documentation**: Improve guides and API documentation
- **Testing**: Add more comprehensive tests
- **Accessibility**: Make the interface more accessible

## 📞 Getting Help

If you need help with contributing:
- Open an issue with the "question" label
- Check existing issues and discussions
- Contact the maintainer: md.anas1028@gmail.com

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors page

Thank you for helping make OCR Text Extractor better! 🚀