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
                sh 'docker --version'
                sh 'docker-compose --version'
            }
        }

        stage('Build Docker Containers') {
            steps {
                echo 'Building application Docker image...'
                sh 'docker-compose build'
            }
        }

        stage('Security Check') {
            steps {
                echo 'Auditing npm packages for vulnerabilities...'
                // Run inside a temporary node container to keep Jenkins agent clean
                sh 'docker run --rm -v ${WORKSPACE}:/app -w /app node:18-alpine npm audit || true'
            }
        }

        stage('Deploy Staging') {
            steps {
                echo 'Deploying application service...'
                // Stop any running containers and launch with the new build
                sh 'docker-compose down'
                sh 'docker-compose up -d'
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
