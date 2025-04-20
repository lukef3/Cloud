<template>
  <authenticator>
    <template v-slot="{ signOut }">
      <div class="container">
        <h1>Allergen-AI</h1>
        <input type="file" @change="handleFileUpload" accept="image/*" />
        <button @click="predictAllergen" :disabled="!selectedFile">
          Predict Allergen
        </button>
        <div v-if="prediction" class="result">
          <img v-if="imageUrl" :src="imageUrl" alt="Uploaded Scan" class="uploaded-image" />
          <h2>Prediction:</h2>
          <p>{{ prediction }}</p>
        </div>
      </div>
      <button @click="signOut">Sign Out</button>
    </template>
  </authenticator>
</template>

<script>
import { Authenticator } from "@aws-amplify/ui-vue";
import "@aws-amplify/ui-vue/styles.css";
import { get, post } from '@aws-amplify/api';
export default {
  name: "App",
  components: {Authenticator},
  data() {
    return {
      selectedFile: null,
      imageUrl: null,
      prediction: "",
    };
  },
  methods: {
    handleFileUpload(event) {
      this.selectedFile = event.target.files[0];
      if (this.selectedFile) {
        this.imageUrl = URL.createObjectURL(this.selectedFile);
      }
      this.prediction = "";
    },
    async predictAllergen() {
      if (!this.selectedFile) {
        this.prediction = "Please select a file first.";
        return;
      }
      this.prediction = "Processing...";
      const api = "allergenApi";

      try {
        const pathGetUrl = '/getUploadUrl';
        const getUrlParams = {
          queryStringParameters: {
            fileName: this.selectedFile.name
          }
        };
        if (this.selectedFile.type) {
          getUrlParams.queryStringParameters.contentType = this.selectedFile.type;
        }
        const getUrlRequest = get({
          apiName: api,
          path: pathGetUrl,
          options: getUrlParams
        });

        const { body } = await getUrlRequest.response;
        const uploadConfig = await body.json();

        const { uploadUrl, key: s3ObjectKey } = uploadConfig;

        if (!uploadUrl || !s3ObjectKey) {
          throw new Error("Server did not provide a valid upload URL or key.");
        }

        this.prediction = "Uploading image...";
        const s3Response = await fetch(uploadUrl, {
          method: 'PUT',
          body: this.selectedFile
        });

        if (!s3Response.ok) {
          const errorText = await s3Response.text().catch(() => "Could not read S3 error response");
          throw new Error(`S3 Upload Failed (${s3Response.status}): ${s3Response.statusText}. ${errorText}`);
        }

        this.prediction = "Analyzing image...";
        const pathPredict = '/predict';
        const predictParams = {
          body: {
            key: s3ObjectKey
          },
          headers: { 'Content-Type': 'application/json' }
        };

        const predictionRequest = post({
          apiName: api,
          path: pathPredict,
          options: predictParams
        });
        const { body: postBody } = await predictionRequest.response;
        const predictionResult = await postBody.json();

        if (predictionResult && predictionResult.prediction) {
          if (typeof predictionResult.prediction === 'object') {
            this.prediction = JSON.stringify(predictionResult.prediction, null, 2);
          } else {
            this.prediction = "Prediction data not found in the response.";
          }
        }

      } catch (error) {
        console.error("Error during prediction:", error);
        this.prediction = "Error occurred during prediction.";
      }
    }
  }
};
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 2rem auto;
  background: #1e1e1e;
  padding: 4rem;
  border-radius: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

input[type="file"] {
  display: block;
  margin: 1rem auto;
  padding: 0.5rem;
  background: #333333;
  color: #e0e0e0;
  border: none;
  border-radius: 4px;
  max-width: 100%;
  box-sizing: border-box;
}

.uploaded-image {
  display: block;
  margin: 0 auto 1.5rem auto;
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  border: 1px solid #444;
}

.result {
  margin-top: 2rem;
  background: #2c2c2c;
  padding: 1rem;
  border-radius: 4px;
  color: #e0e0e0;
}
</style>
