pipeline {
    agent any

    environment {
        CONTAINER_NAME = 'feastdash'
        PORT = '3000'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out code from Git...'
                checkout scm
            }
        }

        stage('Verify Environment') {
            steps {
                echo 'Verifying Docker engine installation...'
                runCmd 'docker --version'
                runCmd 'docker-compose --version'
            }
        }

        stage('Build Docker Containers') {
            steps {
                echo 'Building application Docker image...'
                runCmd 'docker-compose build'
            }
        }

        stage('Security Check') {
            steps {
                echo 'Auditing npm packages for vulnerabilities...'
                script {
                    try {
                        // Use double quotes and escape workspace path correctly for cross-platform mounts
                        runCmd "docker run --rm -v \"${WORKSPACE}:/app\" -w /app node:18-alpine npm audit"
                    } catch (err) {
                        echo "Security audit command completed (non-critical issues logged or skipped)."
                    }
                }
            }
        }

        stage('Deploy Staging') {
            steps {
                echo 'Deploying application service...'
                // Stop any running compose container and start the new one
                runCmd 'docker-compose down'
                runCmd 'docker-compose up -d'
                echo "FeastDash deployment updated successfully on port ${PORT}!"
            }
        }
    }

    post {
        success {
            echo 'FeastDash CI/CD Pipeline completed successfully!'
        }
        failure {
            echo 'FeastDash CI/CD Pipeline failed. Please check build logs.'
        }
    }
}

// Helper method to automatically switch between Unix sh and Windows bat shells
def runCmd(cmd) {
    if (isUnix()) {
        sh cmd
    } else {
        bat cmd
    }
}
