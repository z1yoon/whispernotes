{{/*
Expand the name of the chart.
*/}}
{{- define "whispernotes.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "whispernotes.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "whispernotes.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "whispernotes.labels" -}}
helm.sh/chart: {{ include "whispernotes.chart" . }}
{{ include "whispernotes.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/environment: {{ .Values.global.environment }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "whispernotes.selectorLabels" -}}
app.kubernetes.io/name: {{ include "whispernotes.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name for secrets
*/}}
{{- define "whispernotes.secretName" -}}
{{- printf "%s-secrets" (include "whispernotes.name" .) }}
{{- end }}

{{/*
Create the name for configmap
*/}}
{{- define "whispernotes.configMapName" -}}
{{- printf "%s-config" (include "whispernotes.name" .) }}
{{- end }}


