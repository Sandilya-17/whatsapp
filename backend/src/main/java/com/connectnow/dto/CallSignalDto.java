package com.connectnow.dto;

public class CallSignalDto {
    private String type; // "CALL_OFFER", "CALL_ANSWER", "ICE_CANDIDATE", "CALL_REJECT", "CALL_END", "CALL_BUSY"
    private String callType; // "audio" or "video"
    private Long callerId;
    private String callerUsername;
    private String callerName;
    private Long targetUserId;
    private String targetUsername;
    private Long conversationId;
    private Object sdp;
    private Object candidate;
    private java.util.List<Object> candidates;

    public CallSignalDto() {}

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getCallType() {
        return callType;
    }

    public void setCallType(String callType) {
        this.callType = callType;
    }

    public Long getCallerId() {
        return callerId;
    }

    public void setCallerId(Long callerId) {
        this.callerId = callerId;
    }

    public String getCallerUsername() {
        return callerUsername;
    }

    public void setCallerUsername(String callerUsername) {
        this.callerUsername = callerUsername;
    }

    public String getCallerName() {
        return callerName;
    }

    public void setCallerName(String callerName) {
        this.callerName = callerName;
    }

    public Long getTargetUserId() {
        return targetUserId;
    }

    public void setTargetUserId(Long targetUserId) {
        this.targetUserId = targetUserId;
    }

    public String getTargetUsername() {
        return targetUsername;
    }

    public void setTargetUsername(String targetUsername) {
        this.targetUsername = targetUsername;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public Object getSdp() {
        return sdp;
    }

    public void setSdp(Object sdp) {
        this.sdp = sdp;
    }

    public Object getCandidate() {
        return candidate;
    }

    public void setCandidate(Object candidate) {
        this.candidate = candidate;
    }

    public java.util.List<Object> getCandidates() {
        return candidates;
    }

    public void setCandidates(java.util.List<Object> candidates) {
        this.candidates = candidates;
    }
}
