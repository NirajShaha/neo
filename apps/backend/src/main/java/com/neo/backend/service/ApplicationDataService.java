package com.neo.backend.service;

import com.neo.backend.service.IdentityService.SessionUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ApplicationDataService {
    private final ClaimService claims;
    private final ApprovalViewService approvals;
    private final MandateService mandates;
    private final NotificationService notifications;

    public ApplicationDataService(ClaimService claims, ApprovalViewService approvals,
            MandateService mandates, NotificationService notifications) {
        this.claims = claims;
        this.approvals = approvals;
        this.mandates = mandates;
        this.notifications = notifications;
    }

    public Map<String, Object> load(SessionUser user) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("claims", claims.list(Map.of()));
        result.put("pendingApprovals", approvals.pending(user));
        result.put("decidedApprovals", approvals.decided(user));
        result.put("mandateApprovals", mandates.list().stream().map(mandate -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", mandate.getNumber());
            row.put("requestType", mandate.getRequestType());
            row.put("category", mandate.getCategory());
            row.put("level", mandate.getLevel());
            row.put("overall", mandate.getOverall());
            row.put("clearing", mandate.getClearing());
            row.put("doa", mandate.getDoa());
            row.put("valueVat", "");
            row.put("initialTotal", "-");
            row.put("risks", "(50,000.0000)");
            row.put("risksNegative", true);
            row.put("opportunities", "0.0000");
            row.put("vendorCode", mandate.getVendorCode());
            row.put("vendorName", mandate.getVendorName());
            row.put("coc", mandate.getCoc());
            row.put("raiser", mandate.getRaiser());
            row.put("stakeholders", mandate.getStakeholders());
            row.put("daysPending", "0");
            row.put("openEnquiries", "");
            row.put("actionOutside", "");
            row.put("ageDate", "");
            return row;
        }).toList());
        result.put("notifications", notifications.page(user.id(), 0, 50));
        result.put("unread", notifications.unreadCount(user.id()));
        return result;
    }
}