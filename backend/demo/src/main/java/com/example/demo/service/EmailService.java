package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otp) {
        if (mailSender == null) {
            System.out.println(">>> JavaMailSender not configured. OTP for " + toEmail + " is: " + otp);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("imshan314@gmail.com");
            message.setTo(toEmail);
            message.setSubject("OnTime Verification Code");
            message.setText("Your OnTime email verification OTP is: " + otp + "\nValid for 5 minutes.");

            mailSender.send(message);
            System.out.println(">>> OTP Email successfully sent to: " + toEmail);
        } catch (Exception e) {
            System.err.println(">>> Failed to send OTP email: " + e.getMessage());
            // Fallback console log if SMTP fails
            System.out.println(">>> Fallback OTP for " + toEmail + " is: " + otp);
        }
    }
}