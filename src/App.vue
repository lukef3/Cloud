<template>
  <authenticator>
    <template v-slot="{ signOut }">
      <div class="container">
        <h1 class="title">Allergen‑AI</h1>
        <input
            type="file"
            class="file-input"
            @change="handleFileUpload"
            accept="image/*"
        />
        <button
            class="primary-btn"
            @click="predictAllergen"
            :disabled="!selectedFile || loading"
        >
          {{ loading ? statusMessage : 'Predict Allergen' }}
        </button>

        <div v-if="imageUrl" class="preview">
          <img :src="imageUrl" alt="Uploaded Scan" class="uploaded-image" />
        </div>

        <div v-if="predictions.length" class="result">
          <h2>Predicted Allergens</h2>
          <table class="pred-table">
            <thead>
            <tr>
              <th>Allergen</th>
              <th>Confidence</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in predictions" :key="item.name">
              <td class="allergen-name">{{ item.name }}</td>
              <td class="confidence-cell">
                <div class="confidence-bar">
                  <div
                      class="confidence-fill"
                      :style="{
                        width: (item.confidence * 100) + '%',
                        backgroundColor: confidenceColor(item.confidence)
                      }"
                  />
                </div>
                <span class="confidence-text">
                    {{ (item.confidence * 100).toFixed(1) }}%
                  </span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <div v-if="infoMessage" class="error">{{ infoMessage }}</div>

        <button class="signout-btn" @click="signOut">Sign Out</button>
      </div>
    </template>
  </authenticator>
</template>

<script>
import { Authenticator } from '@aws-amplify/ui-vue';
import '@aws-amplify/ui-vue/styles.css';
import { get, post } from '@aws-amplify/api';

export default {
  name: 'App',
  components: { Authenticator },
  data() {
    return {
      selectedFile: null,
      imageUrl: null,
      predictions: [],
      loading: false,
      statusMessage: '',
      infoMessage: ''
    };
  },
  methods: {
    handleFileUpload(e) {
      this.selectedFile = e.target.files[0] ?? null;
      this.imageUrl = this.selectedFile ? URL.createObjectURL(this.selectedFile) : null;
      this.predictions = [];
      this.infoMessage = '';
    },
    confidenceColor(conf) {
      const hue = conf * 110;
      return `hsl(${hue}, 70%, 50%)`;
    },
    async predictAllergen() {
      if (!this.selectedFile) return;

      this.loading = true;
      this.statusMessage = 'Uploading…';
      this.infoMessage = '';

      const api = 'allergenApi';

      try {
        // get presigned url
        const { body } = await get({
          apiName: api,
          path: '/getUploadUrl',
          options: {
            queryParams: {
              fileName: this.selectedFile.name,
              ...(this.selectedFile.type && { contentType: this.selectedFile.type })
            }
          }
        }).response;
        const { uploadUrl, key: s3ObjectKey } = await body.json();

        // upload image to s3 bucket
        await fetch(uploadUrl, { method: 'PUT', body: this.selectedFile });

        this.statusMessage = 'Analysing…';
        // call prediction endpoint
        const { body: postBody } = await post({
          apiName: api,
          path: '/predict',
          options: {
            body: { key: s3ObjectKey },
            headers: { 'Content-Type': 'application/json' }
          }
        }).response;

        const predictionResult = await postBody.json();
        const raw = predictionResult.prediction;

        this.predictions = Object.entries(raw)
            .map(([name, confidence]) => ({ name, confidence }))
            .sort((a, b) => b.confidence - a.confidence);

        if (!this.predictions.length) {
          this.infoMessage = 'No allergens detected.';
        }
      } catch (err) {
        console.error(err);
        this.infoMessage = 'Something went wrong. Please try again.';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.container {
  max-width: 640px;
  margin: 2rem auto;
  background: #1e1e1e;
  padding: 2.5rem;
  border-radius: 1.25rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  color: #e0e0e0;
}

.title {
  text-align: center;
  margin: 0;
}

.file-input {
  background: #333;
  color: #e0e0e0;
  padding: 0.5rem;
  border-radius: 4px;
}

.preview img {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid #444;
}

.pred-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
}

.pred-table th,
.pred-table td {
  padding: 0.6rem;
  border-bottom: 1px solid #444;
  text-align: left;
}

.error {
  color: #047c94;
  text-align: center;
}

.confidence-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.confidence-bar {
  flex: 1;
  background: #333;
  border-radius: 0.3rem;
  height: 0.6rem;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  transition: width 0.4s ease;
}

.confidence-text {
  min-width: 3.5rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
