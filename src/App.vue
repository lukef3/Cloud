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
export default {
  name: "App",
  data() {
    return {
      selectedFile: null,
      imageUrl: null,
      prediction: "",
      apiEndpointPredict: "https://kw5rskam11.execute-api.eu-west-1.amazonaws.com/dev/predict",
      apiEndpointGetUrl: "https://kw5rskam11.execute-api.eu-west-1.amazonaws.com/dev/getUploadUrl"
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

      try {
        const getUrlEndpoint = new URL(this.apiEndpointGetUrl);
        getUrlEndpoint.searchParams.append('fileName', this.selectedFile.name);
        if (this.selectedFile.type) {
          getUrlEndpoint.searchParams.append('contentType', this.selectedFile.type);
        }

        const configResponse = await fetch(getUrlEndpoint.toString(), { method: 'GET' });

        if (!configResponse.ok) {
          const errorData = await configResponse.json().catch(() => ({}));
          throw new Error(`Failed to get upload URL (${configResponse.status}): ${errorData.error || configResponse.statusText}`);
        }
        const uploadConfig = await configResponse.json();
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

        const predictResponse = await fetch(this.apiEndpointPredict, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: s3ObjectKey }),
        });

        if (!predictResponse.ok) {
          const errorData = await predictResponse.json().catch(() => ({}));
          throw new Error(`Prediction API Error (${predictResponse.status}): ${errorData.error || predictResponse.statusText}`);
        }

        const predictionResult = await predictResponse.json();

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

body {
  background-color: #121212;
  color: #e0e0e0;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.container {
  max-width: 600px;
  margin: 2rem auto;
  background: #1e1e1e;
  padding: 4rem;
  border-radius: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

h1, h2 {
  text-align: center;
  color: #ffffff;
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

button {
  display: block;
  margin: 1rem auto;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  background: #6200ee;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease;
}

button:disabled {
  background: #555555;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #3700b3;
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
