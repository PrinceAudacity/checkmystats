import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

export const getGraph = () =>
  api.get('/nodes/').then(res => res.data)

export const getNode = (nodeId) =>
  api.get(`/nodes/${nodeId}`).then(res => res.data)

export const getPath = (startId, endId) =>
  api.get('/paths/', { params: { start: startId, end: endId } }).then(res => res.data)

export const searchNodes = (query) =>
  api.get('/search/', { params: { q: query } }).then(res => res.data)
