pipeline {
  agent any

  tools {
    nodejs 'Node24'
  }

  options {
    disableConcurrentBuilds()
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  triggers {
    pollSCM('H/2 * * * *')
  }

  environment {
    FRONTEND_IMAGE = 'shoptn-frontend'
    BACKEND_IMAGE = 'shoptn-backend'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm

        script {
          if (env.GIT_BRANCH &&
              !(env.GIT_BRANCH in ['origin/main', 'main'])) {
            error("Deployment is restricted to main; checked out ${env.GIT_BRANCH}.")
          }

          env.COMMIT_TAG = sh(
            script: 'git rev-parse --short=12 HEAD',
            returnStdout: true
          ).trim()
        }
      }
    }

    stage('Validate configuration') {
      steps {
        script {
          if (!env.DOCKERHUB_NAMESPACE?.trim() ||
              env.DOCKERHUB_NAMESPACE.startsWith('YOUR_')) {
            error('Configure DOCKERHUB_NAMESPACE in Jenkins.')
          }

          if (!env.EC2_SSH_HOST?.trim() ||
              env.EC2_SSH_HOST.startsWith('YOUR_')) {
            error('Configure EC2_SSH_HOST in Jenkins.')
          }

          if (!env.EC2_SSH_USER?.trim() ||
              env.EC2_SSH_USER.startsWith('YOUR_')) {
            error('Configure EC2_SSH_USER in Jenkins.')
          }

          if (!(env.DOCKERHUB_NAMESPACE ==~ /[a-z0-9][a-z0-9_-]*/)) {
            error('DOCKERHUB_NAMESPACE must be a lowercase Docker Hub namespace.')
          }

          if (!(env.EC2_SSH_HOST ==~ /[A-Za-z0-9.-]+/)) {
            error('EC2_SSH_HOST must be an IPv4 address or DNS hostname.')
          }

          if (!(env.EC2_SSH_USER ==~ /[a-z_][a-z0-9_-]*/)) {
            error('EC2_SSH_USER contains unsupported characters.')
          }
        }

        sh '''
          set -eu
          command -v node
          command -v npm
          command -v docker
          command -v ssh
          command -v scp
          command -v tar
        '''
      }
    }

    stage('Install, test and build') {
      steps {
        sh '''
          set -eu
          node --version
          npm ci
          CI=true npm test -- --watchAll=false
          npm ci --prefix server
          npm test --prefix server
          node --check server/server.js
          node --check server/config/db.js
          npm run build
        '''
      }
    }

    stage('Build images') {
      steps {
        sh '''
          set -eu

          docker build \
            --build-arg REACT_APP_API_URL=/api \
            --tag "docker.io/${DOCKERHUB_NAMESPACE}/${FRONTEND_IMAGE}:${COMMIT_TAG}" \
            --file Dockerfile .

          docker build \
            --tag "docker.io/${DOCKERHUB_NAMESPACE}/${BACKEND_IMAGE}:${COMMIT_TAG}" \
            --file server/Dockerfile server
        '''
      }
    }

    stage('Push images') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKERHUB_USER',
          passwordVariable: 'DOCKERHUB_TOKEN'
        )]) {
          script {
            try {
              sh '''
                set -eu

                printf '%s' "$DOCKERHUB_TOKEN" |
                  docker login --username "$DOCKERHUB_USER" --password-stdin

                docker push "docker.io/${DOCKERHUB_NAMESPACE}/${FRONTEND_IMAGE}:${COMMIT_TAG}"
                docker push "docker.io/${DOCKERHUB_NAMESPACE}/${BACKEND_IMAGE}:${COMMIT_TAG}"
              '''
            } finally {
              sh 'docker logout'
            }
          }
        }
      }
    }

    stage('Deploy to EC2') {
      steps {
        withCredentials([
          file(
            credentialsId: 'ec2-known-hosts',
            variable: 'SSH_KNOWN_HOSTS'
          )
        ]) {
          sshagent(credentials: ['ec2-ssh-key']) {
            sh '''
              set -eu

              TARGET="${EC2_SSH_USER}@${EC2_SSH_HOST}"
              BUNDLE="deployment-${COMMIT_TAG}.tar.gz"

              tar -czf "$BUNDLE" \
                docker-compose.prod.yml \
                server/database/schema.sql \
                server/database/seed.sql \
                scripts/deploy-remote.sh \
                scripts/rollback-remote.sh \
                scripts/check-health.sh

              trap 'rm -f "$BUNDLE"' EXIT

              scp \
                -o BatchMode=yes \
                -o StrictHostKeyChecking=yes \
                -o "UserKnownHostsFile=$SSH_KNOWN_HOSTS" \
                "$BUNDLE" "$TARGET:/tmp/$BUNDLE"

              ssh \
                -o BatchMode=yes \
                -o StrictHostKeyChecking=yes \
                -o "UserKnownHostsFile=$SSH_KNOWN_HOSTS" \
                "$TARGET" \
                "mkdir -p /opt/shoptn && tar -xzf /tmp/$BUNDLE -C /opt/shoptn && rm -f /tmp/$BUNDLE && chmod 700 /opt/shoptn/scripts/deploy-remote.sh /opt/shoptn/scripts/rollback-remote.sh /opt/shoptn/scripts/check-health.sh && /opt/shoptn/scripts/deploy-remote.sh '$COMMIT_TAG' '$DOCKERHUB_NAMESPACE'"
            '''
          }
        }
      }
    }
  }
}